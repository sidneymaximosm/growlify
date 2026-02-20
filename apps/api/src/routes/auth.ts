import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/prisma.js";
import { HttpError } from "../http/errors.js";
import { hashPassword, verifyPassword } from "../security/password.js";
import { signSession, verifySession } from "../security/session.js";
import { env } from "../config/env.js";
import { DEFAULT_CATEGORIES } from "../domain/defaultCategories.js";
import { generateResetToken, hashResetToken } from "../security/resetTokens.js";
import { sendResetPasswordEmail } from "../services/mailer.js";

export const authRouter = Router();

const RegisterSchema = z.object({
  name: z.string().min(2, "Informe seu nome."),
  email: z.string().email("Informe um email v\u00e1lido."),
  password: z.string().min(6, "A senha deve ter no m\u00ednimo 6 caracteres.")
});

const LoginSchema = z.object({
  email: z.string().email("Informe um email v\u00e1lido."),
  password: z.string().min(1, "Informe sua senha.")
});

const ForgotPasswordSchema = z.object({
  email: z.string().email("Informe um email v\u00e1lido.")
});

const ResetPasswordSchema = z.object({
  token: z.string().min(10, "Token inv\u00e1lido."),
  password: z.string().min(8, "A senha deve ter no m\u00ednimo 8 caracteres.")
});

function setSessionCookie(res: any, token: string) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function getSessionToken(req: any) {
  const auth = String(req.headers?.authorization || "");
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return req.cookies?.[env.COOKIE_NAME];
}

function toUserResponse(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    stripe_customer_id: user.stripeCustomerId,
    stripe_subscription_id: user.stripeSubscriptionId,
    subscription_status: user.subscriptionStatus,
    subscription_current_period_end: user.subscriptionCurrentPeriodEnd
  };
}

function getClientIp(req: any) {
  const xf = String(req.headers?.["x-forwarded-for"] || "")
    .split(",")[0]
    .trim();
  return xf || req.ip || "unknown";
}

type RateState = { count: number; resetAt: number };
const forgotRate = new Map<string, RateState>();
function allowForgotPassword(ip: string, email: string) {
  const key = `${ip}|${email}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const max = 5;

  const current = forgotRate.get(key);
  if (!current || current.resetAt <= now) {
    forgotRate.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= max) return false;
  current.count += 1;
  forgotRate.set(key, current);
  return true;
}

authRouter.post("/register", async (req, res, next) => {
  try {
    const data = RegisterSchema.parse(req.body);
    const email = data.email.trim().toLowerCase();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new HttpError(409, "Email j\u00e1 cadastrado.");

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { name: data.name.trim(), email, passwordHash }
      });
      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((c) => ({
          userId: created.id,
          name: c.name,
          kind: c.kind,
          priority: c.priority
        }))
      });
      return created;
    });

    const token = signSession({ sub: user.id, email: user.email, name: user.name });
    setSessionCookie(res, token);

    res.status(201).json({ token, user: toUserResponse(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const data = LoginSchema.parse(req.body);
    const email = data.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new HttpError(401, "Email ou senha inv\u00e1lidos.");

    const ok = await verifyPassword(data.password, user.passwordHash);
    if (!ok) throw new HttpError(401, "Email ou senha inv\u00e1lidos.");

    const token = signSession({ sub: user.id, email: user.email, name: user.name });
    setSessionCookie(res, token);

    res.json({ token, user: toUserResponse(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", async (req, res, next) => {
  try {
    const token = getSessionToken(req);
    const payload = token ? verifySession(token) : null;
    if (!payload) throw new HttpError(401, "Sess\u00e3o expirada ou inv\u00e1lida. Entre novamente.");

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new HttpError(401, "Sess\u00e3o expirada ou inv\u00e1lida. Entre novamente.");

    res.json({ user: toUserResponse(user) });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", async (_req, res) => {
  res.clearCookie(env.COOKIE_NAME, { path: "/" });
  res.json({ ok: true });
});

authRouter.post("/forgot-password", async (req, res, next) => {
  try {
    // Resposta sempre gen\u00e9rica: n\u00e3o revela se o e-mail existe.
    const generic = { ok: true as const, message: "Se o e-mail estiver cadastrado, voc\u00ea receber\u00e1 um link para redefinir sua senha." };

    const parsed = ForgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) return res.json(generic);

    const email = parsed.data.email.trim().toLowerCase();

    const ip = getClientIp(req);
    const allowed = allowForgotPassword(ip, email);
    if (!allowed) return res.json(generic);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json(generic);

    const { token, tokenHash } = generateResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await prisma.resetPasswordToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt
      }
    });

    const appUrl = String(env.APP_URL || env.PUBLIC_APP_URL || "http://localhost:5173").replace(/\/+$/, "");
    const resetLink = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

    // N\u00e3o falha o fluxo caso o e-mail n\u00e3o possa ser enviado.
    try {
      await sendResetPasswordEmail({ to: user.email, name: user.name, resetLink });
    } catch (err: any) {
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.warn("[forgot-password] Falha ao enviar e-mail:", err?.message || err);
      }
    }

    res.json(generic);
  } catch (err) {
    // N\u00e3o permite que falhas internas (banco/SMTP) revelem informa\u00e7\u00f5es ou interrompam o fluxo.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn("[forgot-password] Erro interno:", err?.message || err);
    }
    res.json({ ok: true, message: "Se o e-mail estiver cadastrado, voc\u00ea receber\u00e1 um link para redefinir sua senha." });
  }
});

authRouter.post("/reset-password", async (req, res, next) => {
  try {
    const data = ResetPasswordSchema.parse(req.body);
    const tokenHash = hashResetToken(String(data.token || "").trim());

    const record = await prisma.resetPasswordToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new HttpError(422, "Token inv\u00e1lido ou expirado. Solicite um novo link.");
    }

    const passwordHash = await hashPassword(data.password);
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
      await tx.resetPasswordToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
    });

    res.json({ ok: true, message: "Senha atualizada com sucesso." });
  } catch (err) {
    next(err);
  }
});
