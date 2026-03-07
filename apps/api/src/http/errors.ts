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

  const isProd = process.env.NODE_ENV === "production";
  const explicit = String(err?.message || "");
  const generic = "Serviço indisponível no momento. Tente novamente.";

  const message = (() => {
    if (status === 500) return generic;

    // Em 503, preferimos não expor detalhes técnicos em produção.
    // Se o erro já veio com uma mensagem amigável (ex.: cobrança indisponível), preservamos.
    if (status === 503) {
      if (!isProd && explicit) return explicit;

      const looksTechnical =
        /configure|apps\/api\/\.env|STRIPE_|DATABASE_URL|JWT_SECRET|stack|prisma/i.test(explicit);

      if (explicit && !looksTechnical) return explicit;
      return generic;
    }

    return String(err?.message || "Falha ao processar a solicitação.");
  })();

  res.status(status).json({ message });
}
