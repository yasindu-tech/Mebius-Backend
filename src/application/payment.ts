import { Request, Response } from "express";
import util from "util";
import Order from "../infrastructure/schemas/Order";
import Stripe from "stripe";
import stripe from "../infrastructure/stripe";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
const FRONTEND_URL = process.env.FRONTEND_URL as string;

async function fulfillCheckout(sessionId: string) {
  console.log(`Starting fulfillment for session: ${sessionId}`);

  try {
    // Retrieve the expanded checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'payment_intent']
    });

    console.log('Retrieved session:', {
      id: session.id,
      payment_status: session.payment_status,
      orderId: session.metadata?.orderId
    });

    // Validate we have an orderId
    if (!session.metadata?.orderId) {
      throw new Error('No orderId in session metadata');
    }

    // Find and update the order
    const order = await Order.findByIdAndUpdate(
      session.metadata.orderId,
      {
        paymentStatus: session.payment_status === 'paid' ? 'PAID' : 'FAILED',
        orderStatus: session.payment_status === 'paid' ? 'CONFIRMED' : 'FAILED',

      },
      { new: true }
    );

    if (!order) {
      throw new Error(`Order ${session.metadata.orderId} not found`);
    }

    console.log('Successfully updated order:', {
      orderId: order._id,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus
    });

  } catch (error) {
    console.error('Fulfillment error:', error);
    throw error;
  }
}

export const handleWebhook = async (req: Request, res: Response) => {
  // Verify we have the raw body
  if (!req.body || !Buffer.isBuffer(req.body)) {
    console.error('Raw body missing - ensure bodyParser.raw() middleware is used');
    res.status(400).send('Webhook Error: Raw body required');
  }

  const sig = req.headers['stripe-signature'] as string;
  
  if (!sig) {
    console.error('Missing Stripe signature header');
    res.status(400).send('Webhook Error: Missing signature header');
  }
  let event: Stripe.Event;
 
  
  try {
    // Verify the webhook signature
    event = stripe.webhooks.constructEvent(
      req.body.toString(), // Convert Buffer to string
      sig,
      endpointSecret
    );
    
    console.log(`Received Stripe event: ${event.type}`);

    // Handle checkout.session.completed events
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log('Checkout session completed:', session.id);
      
      if (!session.metadata || !session.metadata.orderId) {
        console.error('Missing orderId in session metadata');
        res.status(400).send('Webhook Error: Missing orderId');
      }

      await fulfillCheckout(session.id);
      res.status(200).send();
    }

    // Handle other event types if needed
    console.log(`Unhandled event type: ${event.type}`);
    res.status(200).send(); // Always return 200 for unhandled events

  } catch (err) {
    console.error('⚠️ Webhook signature verification failed:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).send(`Webhook Error: ${errorMessage}`);
  }
};

export const createCheckoutSession = async (req: Request, res: Response) => {
  const orderId = req.body.orderId;
  console.log("body", req.body);
  const order = await Order.findById(orderId);

  if (!order) {
    throw new Error("Order not found");
  }
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    line_items: order.items.map((item) => ({
      price: item.product.stripePriceId,
      quantity: item.quantity,
    })),
    mode: "payment",
    return_url: `${FRONTEND_URL}/shop/complete?session_id={CHECKOUT_SESSION_ID}`,
    metadata: {
      orderId: req.body.orderId,
    },
  });

  res.send({ clientSecret: session.client_secret });
};

export const retrieveSessionStatus = async (req: Request, res: Response) => {
  const checkoutSession = await stripe.checkout.sessions.retrieve(
    req.query.session_id as string
  );

  const order = await Order.findById(checkoutSession.metadata?.orderId);
  if (!order) {
    throw new Error("Order not found");
  }

  res.status(200).json({
    orderId: order._id,
    status: checkoutSession.status,
    customer_email: checkoutSession.customer_details?.email,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
  });
};