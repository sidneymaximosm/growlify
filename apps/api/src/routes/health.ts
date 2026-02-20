import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ ok: true, name: "API do Growlify", status: "online" });
});

healthRouter.get("/health", (_req, res) => {
  res.json({ ok: true });
});

