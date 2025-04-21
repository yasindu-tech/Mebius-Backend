import { Request, Response } from "express";
import util from "util";
import Order from "../infrastructure/schemas/Order";
import stripe from "../infrastructure/stripe";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
const FRONTEND_URL = process.env.FRONTEND_URL as string;

async function fulfillCheckout(sessionId: string) {
  try {
    console.log("1. Starting fulfillCheckout for session:", sessionId);

    // Retrieve the Checkout Session from the API with line_items expanded
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });
    console.log("2. Retrieved checkout session:", checkoutSession.id);
    console.log(
      util.inspect(checkoutSession, false, null, true /* enable colors */)
    );

    if (!checkoutSession.metadata?.orderId) {
      throw new Error("No orderId in checkout session metadata");
    }

    const order = await Order.findById(checkoutSession.metadata.orderId);
    if (!order) {
      throw new Error("Order not found");
    }
    console.log("3. Found order:", order._id);

    // Check if already fulfilled to make it idempotent
    if (order.paymentStatus === "PAID" && order.orderStatus === "CONFIRMED") {
      console.log("4. Order already fulfilled");
      return;
    }

    if (order.paymentStatus !== "PENDING") {
      throw new Error(`Payment is not pending (current status: ${order.paymentStatus})`);
    }

    if (order.orderStatus !== "PENDING") {
      throw new Error(`Order is not pending (current status: ${order.orderStatus})`);
    }

    // Check if payment was successful
    console.log("5. Payment status:", checkoutSession.payment_status);
    if (checkoutSession.payment_status === "paid") {
      console.log("6. Payment successful, updating order status");
      const updatedOrder = await Order.findByIdAndUpdate(
        order._id,
        {
          paymentStatus: "PAID",
          orderStatus: "CONFIRMED",
        },
        { new: true }
      );
      console.log("7. Order updated successfully:", updatedOrder);
    } else {
      console.log("8. Payment not yet complete, status:", checkoutSession.payment_status);
    }
  } catch (error) {
    console.error("Error in fulfillCheckout:", error);
    throw error; // Re-throw to handle in the webhook
  }
}

export const handleWebhook = async (req: Request, res: Response) => {
  console.log("Webhook received");
  const payload = req.body;
  const sig = req.headers["stripe-signature"] as string;

  let event;

  try {
    console.log("Constructing Stripe event");
    event = stripe.webhooks.constructEvent(payload, sig, endpointSecret);
    console.log("Stripe event type:", event.type);

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      console.log("Processing checkout session event");
      await fulfillCheckout(event.data.object.id);
      console.log("Checkout fulfillment complete");
      res.status(200).send();
      return;
    }

    console.log("Unhandled event type:", event.type);
    res.status(200).send(); // Still return 200 for unhandled event types
  } catch (err) {
    console.error("Webhook Error:", err);
    // @ts-ignore
    res.status(400).send(`Webhook Error: ${err.message}`);
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