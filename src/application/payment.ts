// controllers/stripeController.ts
import { Request, Response } from "express";
import Stripe from "stripe";
import Order from "../infrastructure/schemas/Order";



const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-03-31.basil",
});

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    const session = await stripe.checkout.sessions.create({
      line_items: req.body.items.map((item: any) => ({
        price_data: {
          currency: "usd",
          product_data: {
            name: item.product.name,
            images: [item.product.image],
          },
          unit_amount: item.product.price * 100,
        },
        quantity: item.quantity,
      })),
      mode: "payment",
      success_url: `${req.headers.origin}/shop/complete?orderId=${req.body.orderId}`,
      cancel_url: `${req.headers.origin}/cancel=true`,
      metadata: {
        orderId: req.body.orderId,
      },
    });

    res.status(200).json({ id: session.id });

  } catch (error: any) {
    console.error("Stripe session error:", error.message);
    res.status(500).json({ error: "Failed to create Stripe session" });
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error("Stripe webhook secret not configured");
    res.status(500).send("Webhook error: Server misconfiguration");
    return;
  }

  let event: Stripe.Event;
  

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log("Stripe Webhook Triggered:", event.type);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  console.log("Stripe Webhook Triggered:", event.type);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        
        if (orderId) {
          console.log("Updating order:", orderId);
    const result = await Order.findByIdAndUpdate(orderId, { paymentStatus: "PAID" });
    console.log("Update result:", result);

        }
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).send();
  } catch (err) {
    console.error("Error processing webhook:", err);
    res.status(500).send("Internal server error");
  }
};