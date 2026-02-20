import { Router } from "express";
import { prisma } from "../db/prisma.js";
import type { AuthedRequest } from "../http/authMiddleware.js";
import { HttpError } from "../http/errors.js";
import { canonicalJsonString, sha256Hex } from "../domain/canonicalJson.js";
import { CalculatorRunSchema, runCalculator } from "../domain/calculator.js";
import crypto from "crypto";

export const calculatorRouter = Router();

const isSqlite = process.env.DATABASE_URL?.startsWith("file:") ?? false;
let ensuredSqliteSchema: Promise<void> | null = null;

async function ensureSqliteGoalTable() {
  if (!isSqlite) return;
  if (!ensuredSqliteSchema) {
    ensuredSqliteSchema = (async () => {
      // Usamos SQL "compatível" para SQLite. Isso evita falhas quando:
      // - o Prisma Client ainda não foi regenerado, ou
      // - o banco ainda não recebeu o push/migrate do novo model Goal.
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS Goal (
          id TEXT PRIMARY KEY NOT NULL,
          userId TEXT NOT NULL,
          type TEXT NOT NULL,
          title TEXT,
          paramsHash TEXT NOT NULL,
          paramsJson TEXT NOT NULL,
          resultJson TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
        );
      `);
      await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS Goal_userId_type_paramsHash ON Goal(userId, type, paramsHash);`);
      await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS Goal_userId_type_updatedAt ON Goal(userId, type, updatedAt);`);
    })();
  }
  await ensuredSqliteSchema;
}

function parseGoalRow(row: any) {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    title: row.title,
    paramsHash: row.paramsHash,
    paramsJson: (() => {
      try {
        return JSON.parse(row.paramsJson || "{}");
      } catch {
        return {};
      }
    })(),
    resultJson: (() => {
      try {
        return JSON.parse(row.resultJson || "{}");
      } catch {
        return {};
      }
    })(),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

calculatorRouter.get("/saved", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;

    if (isSqlite) {
      await ensureSqliteGoalTable();
      const rows = (await prisma.$queryRawUnsafe(
        `SELECT id,userId,type,title,paramsHash,paramsJson,resultJson,createdAt,updatedAt FROM Goal WHERE userId = ? ORDER BY updatedAt DESC LIMIT 12`,
        userId
      )) as any[];
      return res.json({ items: rows.map(parseGoalRow) });
    }

    // Fallback (quando não for SQLite): usa Prisma normal.
    const items = await (prisma as any).goal.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 12 });
    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

calculatorRouter.post("/run-and-save", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const body = CalculatorRunSchema.parse(req.body);

    const canonical = canonicalJsonString(body.params);
    const paramsHash = sha256Hex(canonical);

    let result: Record<string, any>;
    try {
      result = runCalculator(body.type, body.params).result;
    } catch (e: any) {
      throw new HttpError(422, e?.message || "Falha ao calcular.");
    }

    if (isSqlite) {
      await ensureSqliteGoalTable();
      const nowIso = new Date().toISOString();
      const id = crypto.randomUUID();
      const title = body.title ?? null;
      const paramsJson = canonicalJsonString(body.params);
      const resultJson = canonicalJsonString(result);

      // Deduplicação: mesmo usuário + tipo + paramsHash => atualiza (upsert).
      await prisma.$executeRawUnsafe(
        `
        INSERT INTO Goal (id,userId,type,title,paramsHash,paramsJson,resultJson,createdAt,updatedAt)
        VALUES (?,?,?,?,?,?,?,?,?)
        ON CONFLICT(userId,type,paramsHash)
        DO UPDATE SET title=excluded.title, paramsJson=excluded.paramsJson, resultJson=excluded.resultJson, updatedAt=excluded.updatedAt;
        `,
        id,
        userId,
        body.type,
        title,
        paramsHash,
        paramsJson,
        resultJson,
        nowIso,
        nowIso
      );

      const rows = (await prisma.$queryRawUnsafe(
        `SELECT id,userId,type,title,paramsHash,paramsJson,resultJson,createdAt,updatedAt FROM Goal WHERE userId = ? AND type = ? AND paramsHash = ? LIMIT 1`,
        userId,
        body.type,
        paramsHash
      )) as any[];
      const item = rows?.[0] ? parseGoalRow(rows[0]) : null;

      const listRows = (await prisma.$queryRawUnsafe(
        `SELECT id,userId,type,title,paramsHash,paramsJson,resultJson,createdAt,updatedAt FROM Goal WHERE userId = ? ORDER BY updatedAt DESC LIMIT 12`,
        userId
      )) as any[];

      return res.json({ item, items: listRows.map(parseGoalRow), result });
    }

    // Fallback (quando não for SQLite): usa Prisma normal.
    const item = await (prisma as any).goal.upsert({
      where: { userId_type_paramsHash: { userId, type: body.type, paramsHash } },
      update: { title: body.title ?? null, paramsJson: body.params, resultJson: result },
      create: { userId, type: body.type, title: body.title ?? null, paramsHash, paramsJson: body.params, resultJson: result }
    });
    const items = await (prisma as any).goal.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 12 });
    return res.json({ item, items, result });
  } catch (err) {
    next(err);
  }
});

calculatorRouter.delete("/saved/:id", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const id = String(req.params.id || "");
    if (!id) throw new HttpError(400, "Identificador invÃ¡lido.");

    if (isSqlite) {
      await ensureSqliteGoalTable();
      await prisma.$executeRawUnsafe(`DELETE FROM Goal WHERE userId = ? AND id = ?`, userId, id);
      const listRows = (await prisma.$queryRawUnsafe(
        `SELECT id,userId,type,title,paramsHash,paramsJson,resultJson,createdAt,updatedAt FROM Goal WHERE userId = ? ORDER BY updatedAt DESC LIMIT 12`,
        userId
      )) as any[];
      return res.json({ ok: true, items: listRows.map(parseGoalRow) });
    }

    const existing = await (prisma as any).goal.findFirst({ where: { id, userId } });
    if (!existing) throw new HttpError(404, "CÃ¡lculo nÃ£o encontrado.");
    await (prisma as any).goal.delete({ where: { id } });
    const items = await (prisma as any).goal.findMany({ where: { userId }, orderBy: { updatedAt: "desc" }, take: 12 });
    return res.json({ ok: true, items });
  } catch (err) {
    next(err);
  }
});
