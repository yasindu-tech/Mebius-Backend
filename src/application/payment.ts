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
    });

    res.status(200).json({ id: session.id });

  } catch (error: any) {
    console.error("Stripe session error:", error.message);
    res.status(500).json({ error: "Failed to create Stripe session" });
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  const { type, data } = req.body;

  console.log("Stripe Webhook Triggered:", type);

  if (type === "succeeded") {
    await Order.findByIdAndUpdate(data.orderId, { paymentStatus: "PAID" });
  }

  res.status(200).send();
};
