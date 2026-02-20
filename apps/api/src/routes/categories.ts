import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import type { AuthedRequest } from "../http/authMiddleware.js";
import { HttpError } from "../http/errors.js";
import { DEFAULT_CATEGORIES } from "../domain/defaultCategories.js";

export const categoriesRouter = Router();

const CategorySchema = z.object({
  name: z.string().min(2, "Informe o nome da categoria."),
  kind: z.enum(["domestic", "commercial"]),
  priority: z.enum(["essential", "important", "cuttable"]),
  monthlyBudgetCents: z.number().int().nonnegative().nullable().optional()
});

categoriesRouter.get("/", async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).userId;
    let items = await prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" }
    });

    // Backfill para contas antigas (ou ambiente limpo): garante categorias padrão para seleção em Lançamentos.
    if (items.length === 0) {
      await prisma.category.createMany({
        data: DEFAULT_CATEGORIES.map((c) => ({
          userId,
          name: c.name,
          kind: c.kind,
          priority: c.priority
        }))
      });
      items = await prisma.category.findMany({ where: { userId }, orderBy: { name: "asc" } });
    }
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

categoriesRouter.post("/", async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const data = CategorySchema.parse(req.body);
    const item = await prisma.category.create({ data: { ...data, userId } });
    res.status(201).json({ item });
  } catch (err) {
    next(err);
  }
});

categoriesRouter.put("/:id", async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const id = String(req.params.id);
    const data = CategorySchema.partial().parse(req.body);

    const existing = await prisma.category.findFirst({ where: { id, userId } });
    if (!existing) throw new HttpError(404, "Categoria n\u00e3o encontrada.");

    const item = await prisma.category.update({ where: { id }, data });
    res.json({ item });
  } catch (err) {
    next(err);
  }
});

categoriesRouter.delete("/:id", async (req, res, next) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const id = String(req.params.id);

    const existing = await prisma.category.findFirst({ where: { id, userId } });
    if (!existing) throw new HttpError(404, "Categoria n\u00e3o encontrada.");

    await prisma.category.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
