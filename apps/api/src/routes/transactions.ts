import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import type { AuthedRequest } from "../http/authMiddleware.js";
import { HttpError } from "../http/errors.js";
import { includesInsensitive } from "../domain/search.js";

export const transactionsRouter = Router();

const TransactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  amountCents: z.number().int().positive("Informe um valor maior que zero."),
  date: z.string().min(1).transform((v) => new Date(v)),
  categoryId: z.string().nullable().optional(),
  description: z.string().max(200).nullable().optional(),
  method: z.enum(["cash", "card", "pix", "transfer", "other"]),
  tag: z.string().max(30).nullable().optional()
});

const ListSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  type: z.enum(["income", "expense"]).optional(),
  q: z.string().optional(),
  categoryId: z.string().optional()
});

transactionsRouter.get("/", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const q = ListSchema.parse(req.query);
    const from = q.from ? new Date(String(q.from)) : undefined;
    const to = q.to ? new Date(String(q.to)) : undefined;
    const queryText = q.q ? String(q.q).trim() : "";

    let items = await prisma.transaction.findMany({
      where: {
        userId,
        ...(q.type ? { type: q.type } : {}),
        ...(q.categoryId ? { categoryId: q.categoryId } : {}),
        ...(from || to
          ? {
              date: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {})
              }
            }
          : {}),
        // Busca por texto (case-insensitive) aplicada via filtro em memória para manter consistência
        // entre SQLite (sem `mode: "insensitive"`) e outros bancos.
      },
      orderBy: { date: "desc" },
      include: { category: true }
    });

    if (queryText) {
      items = items.filter((t) => includesInsensitive(t.description, queryText) || includesInsensitive(t.tag, queryText));
    }

    res.json({ items });
  } catch (err) {
    next(err);
  }
});

transactionsRouter.post("/", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const data = TransactionSchema.parse(req.body);

    if (data.categoryId) {
      const cat = await prisma.category.findFirst({ where: { id: data.categoryId, userId } });
      if (!cat) throw new HttpError(400, "Categoria inv\u00e1lida.");
    }

    const item = await prisma.transaction.create({
      data: {
        userId,
        type: data.type,
        amountCents: data.amountCents,
        date: data.date,
        categoryId: data.categoryId ?? null,
        description: data.description ?? null,
        method: data.method,
        tag: data.tag ?? null
      }
    });

    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

transactionsRouter.put("/:id", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const id = String(req.params.id);
    const data = TransactionSchema.partial().parse(req.body);

    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) throw new HttpError(404, "Lan\u00e7amento n\u00e3o encontrado.");

    if (data.categoryId) {
      const cat = await prisma.category.findFirst({ where: { id: data.categoryId, userId } });
      if (!cat) throw new HttpError(400, "Categoria inv\u00e1lida.");
    }

    const item = await prisma.transaction.update({
      where: { id },
      data: {
        ...(data.type ? { type: data.type } : {}),
        ...(data.amountCents ? { amountCents: data.amountCents } : {}),
        ...(data.date ? { date: data.date as any } : {}),
        ...(data.categoryId !== undefined ? { categoryId: data.categoryId } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.method ? { method: data.method } : {}),
        ...(data.tag !== undefined ? { tag: data.tag } : {})
      }
    });

    res.json({ item });
  } catch (err) {
    next(err);
  }
});

transactionsRouter.delete("/:id", async (req, res, next) => {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const id = String(req.params.id);

    const existing = await prisma.transaction.findFirst({ where: { id, userId } });
    if (!existing) throw new HttpError(404, "Lan\u00e7amento n\u00e3o encontrado.");

    await prisma.transaction.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
