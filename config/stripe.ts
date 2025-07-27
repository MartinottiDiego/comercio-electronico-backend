import Stripe from 'stripe';

// Configuración de Stripe
export const stripeConfig = {
  secretKey: process.env.STRIPE_SECRET_KEY!,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
  currency: 'eur', // Moneda por defecto
  apiVersion: '2025-06-30.basil' as const, // Versión de la API de Stripe
};
// Instancia de Stripe
export const stripe = new Stripe(stripeConfig.secretKey, {
  apiVersion: stripeConfig.apiVersion,
});

// Tipos para Stripe
export interface StripePaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  client_secret: string;
}

export interface StripeCheckoutSession {
  id: string;
  url: string;
  amount_total: number;
  currency: string;
  status: string;
  payment_status: string;
  customer_email?: string;
  metadata?: Record<string, string>;
}

// Configuración de productos de Stripe (para suscripciones)
export const stripeProducts = {
  basic: {
    name: 'Plan Básico',
    price: 999, // 9.99 EUR en centavos
    interval: 'month' as const,
  },
  premium: {
    name: 'Plan Premium',
    price: 1999, // 19.99 EUR en centavos
    interval: 'month' as const,
  },
}; 