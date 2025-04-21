import express from "express";
import { createCheckoutSession, handleWebhook } from "../application/payment";

export const paymentsRouter = express.Router();

paymentsRouter.post("/create-checkout-session", createCheckoutSession);

// Use `express.raw` middleware for Stripe webhook verification
paymentsRouter.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  handleWebhook
);