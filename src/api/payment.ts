import express from "express";
import { createCheckoutSession, handleWebhook } from "../application/payment";

export const paymentsRouter = express.Router();

paymentsRouter.post("/create-checkout-session", createCheckoutSession);
paymentsRouter.post("/webhook", express.raw({ type: 'application/json' }), handleWebhook);