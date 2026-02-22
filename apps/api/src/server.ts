import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorMiddleware } from "./http/errors.js";
import { requireActiveSubscription, requireAuth } from "./http/authMiddleware.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { categoriesRouter } from "./routes/categories.js";
import { transactionsRouter } from "./routes/transactions.js";
import { reportsRouter } from "./routes/reports.js";
import { billingRouter, stripeWebhook } from "./routes/billing.js";
import { prisma } from "./db/prisma.js";
import { calculatorRouter } from "./routes/calculator.js";

const app = express();

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (origin === "null") return cb(null, true);

      const normalize = (value: string) => {
        const trimmed = value.trim();
        const unquoted =
          (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
          (trimmed.startsWith("'") && trimmed.endsWith("'"))
            ? trimmed.slice(1, -1)
            : trimmed;
        const noTrailingSlash = unquoted.replace(/\/+$/, "");
        try {
          return new URL(noTrailingSlash).origin;
        } catch {
          return noTrailingSlash;
        }
      };

      const allowed = new Set(
        [env.WEB_ORIGIN, env.MOBILE_ORIGIN]
          .flatMap((v) => String(v || "").split(",")) // permite lista separada por vírgula
          .map((v) => v.trim())
          .filter(Boolean)
          .map(normalize)
      );

      const requestOrigin = normalize(origin);

      if (allowed.has(requestOrigin)) return cb(null, true);

      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestOrigin)) {
        return cb(null, true);
      }

      return cb(new Error("Origem não permitida"), false);
    },
    credentials: true,
    optionsSuccessStatus: 204
  })
);

app.use(cookieParser());

// Stripe webhook precisa do raw body (antes do JSON parser)
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// JSON normal (para o restante)
app.use(express.json({ limit: "1mb" }));

app.use("/", healthRouter);

app.use("/api/auth", authRouter);

app.use("/api/categories", requireAuth, categoriesRouter);
app.use("/api/transactions", requireAuth, transactionsRouter);
app.use("/api/reports", requireAuth, reportsRouter);
app.use("/api/calculator", requireAuth, requireActiveSubscription, calculatorRouter);

// Billing (checkout requer auth; webhook não)
app.use("/api/billing", requireAuth, billingRouter);

app.use(errorMiddleware);

const port = Number(env.PORT) || 8080;

app.listen(port, "0.0.0.0", () => {
  console.log(`API do Growlify online na porta ${port}`);
});

// Encerramento seguro
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
