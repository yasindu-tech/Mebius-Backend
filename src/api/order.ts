import express from "express";
import { createOrder, getOrders, getOrderByUser, getOrder } from "../application/order";
import { isAuthenticated } from "./middleware/authentication-middleware";

export const orderRouter = express.Router();

// Define the /all route before the /:id route
orderRouter.route("/all").get(isAuthenticated, getOrders);
orderRouter.route("/").post(isAuthenticated, createOrder);
orderRouter.route("/user").get(isAuthenticated, getOrderByUser);
orderRouter.route("/:id").get(isAuthenticated, getOrder);


