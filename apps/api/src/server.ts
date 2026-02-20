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
      // Permite chamadas sem Origin (curl, health checks)
      if (!origin) return cb(null, true);

      // Alguns contextos (file://, webviews) usam Origin "null"
      if (origin === "null") return cb(null, true);

      // Permite origens configuradas
      if (origin === env.WEB_ORIGIN || origin === env.MOBILE_ORIGIN) return cb(null, true);

      // Dev: permite localhost/127.0.0.1 em qualquer porta (Vite pode subir em 5173, 5174, etc.)
      if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return cb(null, true);

      return cb(new Error("Origem não permitida"), false);
    },
    credentials: true
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

const port = env.PORT;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`API do Growlify online em http://localhost:${port}`);
});

// Encerramento seguro
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
