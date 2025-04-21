import express from "express";
import { createOrder, getOrders, getOrderByUser, getOrder, updateOrderStatus } from "../application/order";
import { isAuthenticated } from "./middleware/authentication-middleware";
import { isAdmin } from "./middleware/authorization-middleware";

export const orderRouter = express.Router();

// Define the /all route before the /:id route
orderRouter.route("/all").get(getOrders);
orderRouter.route("/").post(isAuthenticated, createOrder);
orderRouter.route("/user").get(isAuthenticated, getOrderByUser);
orderRouter.route("/:id").get(isAuthenticated, getOrder);
orderRouter.route("/:id").put(updateOrderStatus);

