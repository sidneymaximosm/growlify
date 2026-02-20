import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import { verifySession } from "../security/session.js";
import { prisma } from "../db/prisma.js";

export type AuthedRequest = Request & { userId: string };

function getSessionToken(req: Request) {
  const auth = String(req.headers.authorization || "");
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return req.cookies?.[env.COOKIE_NAME];
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getSessionToken(req);
  const payload = token ? verifySession(token) : null;
  if (!payload) {
    return res.status(401).json({ message: "Sess\u00e3o expirada ou inv\u00e1lida. Entre novamente." });
  }
  (req as AuthedRequest).userId = payload.sub;
  next();
}

export function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  (async () => {
    try {
      const userId = String((req as any).userId || "");
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { subscriptionStatus: true } });
      if (!user || user.subscriptionStatus !== "active") {
        return res.status(402).json({ message: "Assinatura necess\u00e1ria." });
      }
      next();
    } catch (e) {
      next(e);
    }
  })();
}
