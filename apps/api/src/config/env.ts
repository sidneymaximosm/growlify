import dotenv from "dotenv";
import { z } from "zod";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import fs from "fs";

// Carrega vari\u00e1veis a partir do `.env` do projeto (`apps/api/.env`),
// independentemente do diret\u00f3rio atual (CWD).
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Arquivo atual: apps/api/src/config/env.ts
// Para chegar na raiz do app (apps/api), subimos 2 n\u00edveis: src/config -> src -> apps/api
const apiRoot = resolve(__dirname, "../.."); // apps/api

// Garante que caminhos relativos (ex.: SQLite `file:./...`) funcionem sempre.
process.chdir(apiRoot);

dotenv.config({ path: join(apiRoot, ".env") });

// Garante que a pasta `prisma/` exista antes do Prisma inicializar (Windows/OneDrive pode falhar se não existir).
try {
  fs.mkdirSync(join(apiRoot, "prisma"), { recursive: true });
} catch {
  // ignore
}

// Resolve DATABASE_URL relativo para absoluto (evita depender de CWD, e corrige falhas no Windows/OneDrive).
// Exemplos aceitos:
// - file:./prisma/dev.db
// - file:prisma/dev.db
const rawDbUrl = process.env.DATABASE_URL;
if (rawDbUrl && rawDbUrl.startsWith("file:")) {
  const filePath = rawDbUrl.slice("file:".length);
  const normalized = filePath.startsWith("./") || filePath.startsWith(".\\") ? filePath : `./${filePath}`;
  const abs = resolve(apiRoot, normalized);
  // Garante que o diretório do arquivo exista.
  try {
    fs.mkdirSync(dirname(abs), { recursive: true });
  } catch {
    // ignore
  }
  // Prisma l\u00ea melhor com / em URLs.
  process.env.DATABASE_URL = `file:${abs.replace(/\\/g, "/")}`;
}

// Logs temporários para diagnóstico (remover quando estabilizar).
if (process.env.NODE_ENV !== "production") {
  // eslint-disable-next-line no-console
  console.log("[env] cwd:", process.cwd());
  // eslint-disable-next-line no-console
  console.log("[env] apiRoot:", apiRoot);
  // eslint-disable-next-line no-console
  console.log("[env] DATABASE_URL:", process.env.DATABASE_URL);
}

const EnvSchema = z.object({
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(12),
  COOKIE_NAME: z.string().min(1).default("growlify_session"),

  WEB_ORIGIN: z.string().min(1).default("http://localhost:5173"),
  MOBILE_ORIGIN: z.string().min(1).default("http://localhost:19006"),
  PUBLIC_APP_URL: z.string().min(1).default("http://localhost:5173"),

  STRIPE_SECRET_KEY: z.string().optional().default(""),
  STRIPE_WEBHOOK_SECRET: z.string().optional().default(""),
  STRIPE_PRICE_ID: z.string().optional().default(""),

  // Reset de senha via e-mail
  APP_URL: z.string().optional().default(process.env.PUBLIC_APP_URL || "http://localhost:5173"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  MAIL_FROM: z.string().optional().default("")
});

export const env = EnvSchema.parse(process.env);
