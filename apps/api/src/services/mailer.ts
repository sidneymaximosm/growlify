import nodemailer from "nodemailer";
import { env } from "../config/env.js";

type ResetPasswordEmailInput = {
  to: string;
  name?: string | null;
  resetLink: string;
};

function isConfigured() {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.MAIL_FROM);
}

function transport() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
  });
}

export async function sendResetPasswordEmail(input: ResetPasswordEmailInput) {
  if (!isConfigured()) return { ok: false as const, skipped: true as const };

  const firstName = String(input.name || "").trim().split(/\s+/)[0] || "Olá";
  const subject = "Redefinição de senha — Growlify";
  const text = `${firstName},\n\nRecebemos uma solicitação para redefinir sua senha.\n\nUse o link abaixo para criar uma nova senha (válido por tempo limitado):\n${input.resetLink}\n\nSe você não solicitou isso, ignore este e-mail.\n`;
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; line-height: 1.5; color: #0b1220;">
      <p style="margin:0 0 12px;">${firstName},</p>
      <p style="margin:0 0 12px;">Recebemos uma solicitação para redefinir sua senha.</p>
      <p style="margin:0 0 12px;">Use o link abaixo para criar uma nova senha (válido por tempo limitado):</p>
      <p style="margin:0 0 18px;"><a href="${input.resetLink}" target="_blank" rel="noreferrer">${input.resetLink}</a></p>
      <p style="margin:0;">Se você não solicitou isso, ignore este e-mail.</p>
    </div>
  `.trim();

  await transport().sendMail({
    from: env.MAIL_FROM,
    to: input.to,
    subject,
    text,
    html
  });

  return { ok: true as const };
}

