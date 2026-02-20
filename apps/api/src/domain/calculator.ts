import { z } from "zod";

export const CalculatorRunSchema = z.object({
  type: z.string().min(1, "Informe o tipo do cálculo."),
  params: z.record(z.any()),
  title: z.string().min(1).max(80).optional()
});

export type CalculatorResult = {
  type: string;
  result: Record<string, any>;
};

function asCents(value: any) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

function parseDateOnlyUtc(isoDate: string) {
  // yyyy-mm-dd
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate).trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mm = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mm) || !Number.isFinite(d)) return null;
  return new Date(Date.UTC(y, mm - 1, d, 0, 0, 0, 0));
}

export function runCalculator(type: string, params: Record<string, any>): CalculatorResult {
  if (type === "daily_limit_month") {
    const limitCents = asCents(params.limitCents);
    const spentCents = asCents(params.spentCents);
    const asOfDateUtc = params.asOfDate ? parseDateOnlyUtc(String(params.asOfDate)) : null;
    const asOf = asOfDateUtc || (params.asOf ? new Date(String(params.asOf)) : new Date());
    const daysBase = asCents(params.daysBase);
    if (limitCents === null || limitCents <= 0) throw new Error("Informe um limite mensal válido.");
    if (spentCents === null || spentCents < 0) throw new Error("Informe um gasto do mês válido.");
    if (Number.isNaN(asOf.getTime())) throw new Error("Data de referência inválida.");

    // Contagem inclusiva de dias (hoje + ... + último dia do mês) em UTC para estabilidade.
    const year = asOfDateUtc ? asOf.getUTCFullYear() : asOf.getFullYear();
    const month = asOfDateUtc ? asOf.getUTCMonth() : asOf.getMonth();
    const startDay = asOfDateUtc ? asOf : new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate());
    const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
    const autoDaysLeft = Math.max(1, Math.floor((end.getTime() - startDay.getTime()) / 86400_000) + 1);
    const daysLeft = daysBase && daysBase >= 1 && daysBase <= 31 ? daysBase : autoDaysLeft;
    const remainingCents = limitCents - spentCents;
    const perDayCents = Math.trunc(remainingCents / daysLeft);

    return {
      type,
      result: {
        limitCents,
        spentCents,
        remainingCents,
        daysLeft,
        perDayCents,
        daysMode: daysBase && daysBase >= 1 && daysBase <= 31 ? "manual" : "auto"
      }
    };
  }

  if (type === "weekly_savings_goal") {
    const targetCents = asCents(params.targetCents);
    const weeks = asCents(params.weeks);
    if (targetCents === null || targetCents <= 0) throw new Error("Informe uma meta válida.");
    if (weeks === null || weeks <= 0) throw new Error("Informe um número de semanas válido.");
    const perWeekCents = Math.ceil(targetCents / weeks);
    return { type, result: { targetCents, weeks, perWeekCents } };
  }

  if (type === "simulate_cut") {
    const currentMonthlyCents = asCents(params.currentMonthlyCents);
    const cutCents = asCents(params.cutCents);
    if (currentMonthlyCents === null || currentMonthlyCents <= 0) throw new Error("Informe um valor mensal atual válido.");
    if (cutCents === null || cutCents <= 0) throw new Error("Informe um valor de corte válido.");
    const nextMonthlyCents = Math.max(0, currentMonthlyCents - cutCents);
    const pct = Math.min(100, Math.max(0, (cutCents / currentMonthlyCents) * 100));
    return { type, result: { currentMonthlyCents, cutCents, nextMonthlyCents, pct } };
  }

  if (type === "emergency_fund") {
    const monthlyExpensesCents = asCents(params.monthlyExpensesCents);
    const months = asCents(params.months);
    if (monthlyExpensesCents === null || monthlyExpensesCents <= 0) throw new Error("Informe um gasto mensal válido.");
    if (months === null || months <= 0) throw new Error("Informe a quantidade de meses.");
    const neededCents = monthlyExpensesCents * months;
    return { type, result: { monthlyExpensesCents, months, neededCents } };
  }

  throw new Error("Tipo de cálculo indefinido.");
}
