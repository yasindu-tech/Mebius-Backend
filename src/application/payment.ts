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
  const sig = req.headers["stripe-signature"]!;
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return; // Ensure the function exits after sending a response
  }

  // Handle the event
  switch (event.type) {
    case "payment_intent.succeeded":
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata.orderId;

      try {
        // Update the paymentStatus to PAID
        await Order.findByIdAndUpdate(orderId, { paymentStatus: "PAID" });
        console.log(`Order ${orderId} paymentStatus updated to PAID`);
      } catch (error) {
        console.error("Error updating payment status:", error);
        res.status(500).send("Error updating payment status");
        return; // Ensure the function exits after sending a response
      }
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
  res.status(200).send();
};