import type { Request, Response, NextFunction } from "express";
import { Router } from "express";
import Stripe from "stripe";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import type { AuthedRequest } from "../http/authMiddleware.js";
import { HttpError } from "../http/errors.js";

export const billingRouter = Router();

function devHint(message: string) {
  return process.env.NODE_ENV === "production" ? "Cobrança indisponível no momento." : message;
}

function getStripe() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new HttpError(503, devHint("Cobrança indisponível: configure STRIPE_SECRET_KEY no apps/api/.env."));
  }
  return new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
}

export async function createCheckoutSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthedRequest).userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(401, "Sess\u00e3o expirada ou inv\u00e1lida. Entre novamente.");
    if (!env.STRIPE_PRICE_ID) {
      throw new HttpError(
        503,
        devHint("Cobrança indisponível: configure STRIPE_PRICE_ID no apps/api/.env (Price mensal BRL R$ 27,90).")
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
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      currency: "brl",
      line_items: [{ price: env.STRIPE_PRICE_ID, quantity: 1 }],
      // Teste gratuito: 7 dias com cartão obrigatório. Se cancelar antes, não há cobrança.
      payment_method_collection: "always",
      subscription_data: {
        trial_period_days: 7
      },
      success_url: `${baseUrl}/inicio?pagamento=sucesso`,
      cancel_url: `${baseUrl}/perfil?pagamento=cancelado`,
      allow_promotion_codes: false
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
}

export async function createPortalSession(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = (req as AuthedRequest).userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new HttpError(401, "Sessão expirada ou inválida. Entre novamente.");

    const stripe = getStripe();
    const customerId = user.stripeCustomerId;
    if (!customerId) throw new HttpError(409, "Assinatura ainda não iniciada.");

    const baseUrl = env.PUBLIC_APP_URL.replace(/\/+$/, "");
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${baseUrl}/perfil`
    });

    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
}

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
      const statusMap: Record<string, "active" | "past_due" | "canceled" | "inactive"> = {
        active: "active",
        trialing: "active",
        past_due: "past_due",
        canceled: "canceled",
        unpaid: "past_due",
        incomplete: "inactive",
        incomplete_expired: "inactive",
        paused: "inactive"
      };

      const mapped = statusMap[sub.status] ?? "inactive";
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
    next(err);
  }
}

billingRouter.post("/checkout-session", createCheckoutSession);
billingRouter.post("/portal-session", createPortalSession);
billingRouter.post("/webhook", stripeWebhook);
