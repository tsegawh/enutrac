import Stripe from 'stripe';

export interface StripeCheckoutRequest {
  orderId: string;
  amount: number;
  currency: string;
  planName: string;
  userEmail: string;
  userId: string;
  planId: string;
  successUrl: string;
  cancelUrl: string;
}

export interface StripeEmbeddedCheckoutRequest {
  orderId: string;
  amount: number;
  currency: string;
  planName: string;
  userEmail: string;
  userId: string;
  planId: string;
  returnUrl: string;
  metadata?: Record<string, string>;
}

export interface StripeCheckoutResponse {
  sessionId: string;
  checkoutUrl: string;
}

export interface StripeEmbeddedCheckoutResponse {
  clientSecret: string;
  sessionId: string;
}

export class StripePaymentService {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor() {
    const apiKey = process.env.STRIPE_SECRET_KEY;

    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured');
    }

    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-09-30.clover',
    });

    this.webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

    console.log('✅ Stripe Payment Service initialized');
  }

  async createEmbeddedCheckoutSession(request: StripeEmbeddedCheckoutRequest): Promise<StripeEmbeddedCheckoutResponse> {
    try {
      console.log('💳 Creating Stripe embedded checkout session for order:', request.orderId);

      const session = await this.stripe.checkout.sessions.create({
        ui_mode: 'embedded',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: request.currency.toLowerCase(),
              product_data: {
                name: request.planName,
                description: `Enutrac GPS Subscription - ${request.planName}`,
              },
              unit_amount: Math.round(request.amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        return_url: request.returnUrl,
        customer_email: request.userEmail,
        client_reference_id: request.orderId,
        metadata: {
          orderId: request.orderId,
          userId: request.userId,
          planId: request.planId,
        },
      });

      console.log('✅ Stripe embedded checkout session created:', session.id);

      return {
        clientSecret: session.client_secret || '',
        sessionId: session.id,
      };
    } catch (error) {
      console.error('❌ Error creating Stripe embedded checkout session:', error);
      throw error;
    }
  }

  async createCheckoutSession(request: StripeCheckoutRequest): Promise<StripeCheckoutResponse> {
    try {
      console.log('💳 Creating Stripe checkout session for order:', request.orderId);

      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: request.currency.toLowerCase(),
              product_data: {
                name: request.planName,
                description: `Traccar GPS Subscription - ${request.planName}`,
              },
              unit_amount: Math.round(request.amount * 100),
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
        customer_email: request.userEmail,
        client_reference_id: request.orderId,
        metadata: {
          orderId: request.orderId,
          userId: request.userId,
          planId: request.planId,
        },
      });

      console.log('✅ Stripe checkout session created:', session.id);

      return {
        sessionId: session.id,
        checkoutUrl: session.url || '',
      };
    } catch (error) {
      console.error('❌ Error creating Stripe checkout session:', error);
      throw error;
    }
  }

  verifyWebhook(payload: string | Buffer, signature: string): Stripe.Event {
    try {
      if (!this.webhookSecret) {
        console.warn('⚠️ STRIPE_WEBHOOK_SECRET not set, skipping signature verification');
        return JSON.parse(payload.toString());
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.webhookSecret
      );

      return event;
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error);
      throw error;
    }
  }

  async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    try {
      return await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch (error) {
      console.error('❌ Error retrieving session:', error);
      throw error;
    }
  }
}

const stripeService = new StripePaymentService();

export async function createStripeEmbeddedCheckout(request: StripeEmbeddedCheckoutRequest): Promise<StripeEmbeddedCheckoutResponse> {
  return stripeService.createEmbeddedCheckoutSession(request);
}

export async function createStripeCheckout(request: StripeCheckoutRequest): Promise<StripeCheckoutResponse> {
  return stripeService.createCheckoutSession(request);
}

export function verifyStripeWebhook(payload: string | Buffer, signature: string): Stripe.Event {
  return stripeService.verifyWebhook(payload, signature);
}

export async function getStripeSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return stripeService.retrieveSession(sessionId);
}
