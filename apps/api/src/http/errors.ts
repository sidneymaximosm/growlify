import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errorMiddleware(err: any, _req: Request, res: Response, _next: NextFunction) {
  let status = typeof err?.status === "number" ? err.status : 500;

  if (err instanceof ZodError) {
    status = 422;
    const message = err.issues?.[0]?.message || "Falha ao validar os dados.";
    return res.status(status).json({ message });
  }

  // Evita 500 em falhas de banco (ex.: SQLite inacessível). Preferimos 503.
  const errName = String(err?.name || "");
  if (status === 500 && /^PrismaClient/i.test(errName)) {
    status = 503;
  }

  if ((status === 500 || /^PrismaClient/i.test(errName)) && process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  const message =
    status === 500 || status === 503
      ? "Servi\u00e7o indispon\u00edvel no momento. Tente novamente."
      : String(err?.message || "Falha ao processar a solicita\u00e7\u00e3o.");

  res.status(status).json({ message });
}
