import dotenv from "dotenv";
import { z } from "zod";
import { fileURLToPath } from "url";
import { dirname, join, resolve } from "path";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const apiRoot = resolve(__dirname, "../..");

// Garante que caminhos relativos (ex.: SQLite `file:./...`) funcionem sempre.
process.chdir(apiRoot);
dotenv.config({ path: join(apiRoot, ".env") });

try {
  fs.mkdirSync(join(apiRoot, "prisma"), { recursive: true });
} catch {
  // ignore
}

const envFirst = (...keys: string[]) => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return undefined;
};

// Compatibiliza nomes de variáveis do provedor (Railway) com os nomes esperados no código.
if (!process.env.DATABASE_URL) process.env.DATABASE_URL = envFirst("URL_DO_BANCO_DE_DADOS");
if (!process.env.COOKIE_NAME)
  process.env.COOKIE_NAME = envFirst("NOME_DO_COOKIE") ?? "growlify_session";
if (!process.env.WEB_ORIGIN)
  process.env.WEB_ORIGIN = envFirst("ORIGEM_WEB") ?? "http://localhost:5173";
if (!process.env.PUBLIC_APP_URL)
  process.env.PUBLIC_APP_URL =
    envFirst("URL_DO_APLICATIVO_PUBLICO", "URL_do_aplicativo_público") ??
    "http://localhost:5173";

// Resolve DATABASE_URL relativo para absoluto.
const rawDbUrl = process.env.DATABASE_URL;
if (rawDbUrl && rawDbUrl.startsWith("file:")) {
  const filePath = rawDbUrl.slice("file:".length);
  const normalized =
    filePath.startsWith("./") || filePath.startsWith(".\\")
      ? filePath
      : `./${filePath}`;

  const abs = resolve(apiRoot, normalized);

  try {
    fs.mkdirSync(dirname(abs), { recursive: true });
  } catch {
    // ignore
  }

  process.env.DATABASE_URL = `file:${abs.replace(/\\/g, "/")}`;
}

if (process.env.NODE_ENV !== "production") {
  console.log("[env] cwd:", process.cwd());
  console.log("[env] apiRoot:", apiRoot);
  console.log("[env] DATABASE_URL:", process.env.DATABASE_URL);
  console.log("[env] COOKIE_NAME:", process.env.COOKIE_NAME);
  console.log("[env] WEB_ORIGIN:", process.env.WEB_ORIGIN);
  console.log("[env] PUBLIC_APP_URL:", process.env.PUBLIC_APP_URL);
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

  APP_URL: z
    .string()
    .optional()
    .default(process.env.PUBLIC_APP_URL || "http://localhost:5173"),
  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASS: z.string().optional().default(""),
  MAIL_FROM: z.string().optional().default(""),
});

export const env = EnvSchema.parse(process.env);
