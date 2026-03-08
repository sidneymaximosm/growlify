import type { Request, Response, NextFunction } from "express";
import { Router } from "express";
import Stripe from "stripe";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import type { AuthedRequest } from "../http/authMiddleware.js";
import { HttpError } from "../http/errors.js";

export const billingRouter = Router();

function devHint(message: string) {
  return process.env.NODE_ENV === "production" ? "CobranÃƒÂ§a indisponÃƒÂ­vel no momento." : message;
}

function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new HttpError(503, devHint("CobranÃƒÂ§a indisponÃƒÂ­vel: configure STRIPE_SECRET_KEY no apps/api/.env."));
  }
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2025-02-24.acacia" });
}

type MappedSubscriptionStatus = "active" | "past_due" | "canceled" | "inactive";

function mapStripeSubscriptionStatus(status: Stripe.Subscription["status"]): MappedSubscriptionStatus {
  const statusMap: Record<string, MappedSubscriptionStatus> = {
    active: "active",
    trialing: "active",
    past_due: "past_due",
    unpaid: "past_due",
    canceled: "canceled",
    incomplete: "inactive",
    incomplete_expired: "inactive",
    paused: "inactive"
  };

  return statusMap[status] ?? "inactive";
}

function pickBestSubscription(subs: Stripe.Subscription[]): Stripe.Subscription | null {
  if (!subs.length) return null;

  const prio: Record<string, number> = {
    active: 0,
    trialing: 0,
    past_due: 1,
    unpaid: 1,
    incomplete: 2,
    paused: 3,
    canceled: 4,
    incomplete_expired: 4
  };

  return (
    subs
      .slice()
      .sort((a, b) => {
        const pa = prio[a.status] ?? 9;
        const pb = prio[b.status] ?? 9;
        if (pa !== pb) return pa - pb;
        return (b.created ?? 0) - (a.created ?? 0);
      })[0] ?? null
  );
}

async function updateUserFromSubscription(userId: string, sub: Stripe.Subscription) {
  const mapped = mapStripeSubscriptionStatus(sub.status);
  const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      stripeSubscriptionId: sub.id,
      subscriptionStatus: mapped,
      subscriptionCurrentPeriodEnd: currentPeriodEnd
    }
  });

  return { mapped, currentPeriodEnd };
}


export async function createCheckoutSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(401, "Sess\u00e3o expirada ou inv\u00e1lida. Entre novamente.");
    if (!env.STRIPE_PRICE_ID) {
      throw new HttpError(
        503,
        devHint("CobranÃƒÂ§a indisponÃƒÂ­vel: configure STRIPE_PRICE_ID no apps/api/.env (Price mensal BRL R$ 27,90).")
      );
    }

    const stripe = getStripe();

    const customerId =
      user.stripeCustomerId ||
      (await stripe.customers.create({ email: user.email, name: user.name })).id;

    if (!user.stripeCustomerId) {
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
    }

    const baseUrl = env.PUBLIC_APP_URL.replace(/\/+$/, "");
    
    // Evita criar múltiplas assinaturas para o mesmo cliente.
    // Se já existir assinatura (ativa/em teste/pendente), sincronizamos e voltamos ao Paywall para liberar o acesso.
    const existingSubs = await stripe.subscriptions.list({ customer: customerId, status: "all", limit: 10 });
    const bestExisting = pickBestSubscription(existingSubs.data);
    if (bestExisting && ["active", "trialing", "past_due", "unpaid"].includes(bestExisting.status)) {
      await updateUserFromSubscription(user.id, bestExisting);
      return res.json({ url: `${baseUrl}/#/paywall?pagamento=sucesso` });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      currency: "brl",
      line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
      // Teste gratuito: 7 dias com cartÃƒÂ£o obrigatÃƒÂ³rio. Se cancelar antes, nÃƒÂ£o hÃƒÂ¡ cobranÃƒÂ§a.
      payment_method_collection: "always",
      subscription_data: {
        trial_period_days: 7
      },
      // Importante: o status pode depender de webhook (trialing/active). Ao voltar do Checkout,
      // caÃ­mos no Paywall com um parÃ¢metro para disparar sincronizaÃ§Ã£o e liberar o acesso.
      success_url: `${baseUrl}/#/paywall?pagamento=sucesso`,
      cancel_url: `${baseUrl}/#/perfil?pagamento=cancelado`,
      allow_promotion_codes: false
    });

    res.json({ url: session.url });
  } catch (err) {
    const e = err as any;

    // Erros do Stripe normalmente indicam configuraÃ§Ã£o invÃ¡lida (chave/price em modos diferentes)
    // ou falha temporÃ¡ria. Evitamos retornar 500 genÃ©rico.
    try {
      const stripeType = typeof e?.type === "string" ? e.type : "";
      const stripeMsg = String(e?.raw?.message || e?.message || "").trim();
      if (stripeType && stripeMsg) {
        // eslint-disable-next-line no-console
        console.error("[stripe]", { type: stripeType, code: e?.raw?.code, message: stripeMsg });
        return next(new HttpError(503, devHint(`CobranÃ§a indisponÃ­vel: ${stripeMsg}`)));
      }
    } catch {
      // ignore
    }

    next(err);
  }}

export async function createPortalSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(401, "SessÃƒÂ£o expirada ou invÃƒÂ¡lida. Entre novamente.");

    const stripe = getStripe();
    const customerId = user.stripeCustomerId;
    if (!customerId) throw new HttpError(409, "Assinatura ainda nÃƒÂ£o iniciada.");

    const baseUrl = env.PUBLIC_APP_URL.replace(/\/+$/, "");
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/#/perfil`
    });

    res.json({ url: session.url });
  } catch (err) {
    const e = err as any;

    // Erros do Stripe normalmente indicam configuraÃ§Ã£o invÃ¡lida (chave/price em modos diferentes)
    // ou falha temporÃ¡ria. Evitamos retornar 500 genÃ©rico.
    try {
      const stripeType = typeof e?.type === "string" ? e.type : "";
      const stripeMsg = String(e?.raw?.message || e?.message || "").trim();
      if (stripeType && stripeMsg) {
        // eslint-disable-next-line no-console
        console.error("[stripe]", { type: stripeType, code: e?.raw?.code, message: stripeMsg });
        return next(new HttpError(503, devHint(`CobranÃ§a indisponÃ­vel: ${stripeMsg}`)));
      }
    } catch {
      // ignore
    }

    next(err);
  }}

export async function stripeWebhook(req: Request, res: Response, next: NextFunction) {
  try {
    if (!env.STRIPE_WEBHOOK_SECRET) throw new HttpError(503, "Webhook n\u00e3o configurado.");
    const stripe = getStripe();
    const sig = req.headers["stripe-signature"];
    if (!sig || typeof sig !== "string") throw new HttpError(400, "Assinatura do webhook ausente.");

    const raw = req.body as Buffer;
    const event = stripe.webhooks.constructEvent(raw, sig, env.STRIPE_WEBHOOK_SECRET);

    const upsertFromSubscription = async (sub: Stripe.Subscription) => {
      const customerId = String(sub.customer);
      const mapped = mapStripeSubscriptionStatus(sub.status);
      const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null;

      await prisma.user.updateMany({
        where: { stripeCustomerId: customerId },
        data: {
          stripeSubscriptionId: sub.id,
          subscriptionStatus: mapped,
          subscriptionCurrentPeriodEnd: currentPeriodEnd
        }
      });
    };

    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      await upsertFromSubscription(event.data.object as Stripe.Subscription);
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      await prisma.user.updateMany({
        where: { stripeCustomerId: String(sub.customer) },
        data: { subscriptionStatus: "canceled", subscriptionCurrentPeriodEnd: null }
      });
    }

    res.json({ received: true });
  } catch (err) {
    const e = err as any;

    // Erros do Stripe normalmente indicam configuraÃ§Ã£o invÃ¡lida (chave/price em modos diferentes)
    // ou falha temporÃ¡ria. Evitamos retornar 500 genÃ©rico.
    try {
      const stripeType = typeof e?.type === "string" ? e.type : "";
      const stripeMsg = String(e?.raw?.message || e?.message || "").trim();
      if (stripeType && stripeMsg) {
        // eslint-disable-next-line no-console
        console.error("[stripe]", { type: stripeType, code: e?.raw?.code, message: stripeMsg });
        return next(new HttpError(503, devHint(`CobranÃ§a indisponÃ­vel: ${stripeMsg}`)));
      }
    } catch {
      // ignore
    }

    next(err);
  }}


export async function syncSubscription(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as unknown as AuthedRequest).userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(401, "SessÃ£o expirada ou invÃ¡lida. Entre novamente.");
    if (!user.stripeCustomerId) throw new HttpError(409, "Assinatura ainda nÃ£o iniciada.");

    const stripe = getStripe();
    const subs = await stripe.subscriptions.list({ customer: user.stripeCustomerId, status: "all", limit: 10 });
    const best = pickBestSubscription(subs.data);
    if (!best) return res.json({ ok: true, updated: false });


    const { mapped } = await updateUserFromSubscription(user.id, best);

    res.json({ ok: true, updated: true, status: mapped });
  } catch (err) {
    next(err);
  }
}

billingRouter.post("/checkout-session", createCheckoutSession);
billingRouter.post("/portal-session", createPortalSession);
billingRouter.post("/webhook", stripeWebhook);
billingRouter.post("/sync", syncSubscription);

