import express from "express";

import { clerkMiddleware } from "@clerk/express";
import cors from "cors";
import "dotenv/config";
import { categoryRouter } from "./api/category";
import globalErrorHandlingMiddleware from "./api/middleware/global-error-handling-middleware";
import { orderRouter } from "./api/order";
import { paymentsRouter } from "./api/payment";
import { productRouter } from "./api/product";
import { userRouter } from "./api/user";
import { connectDB } from "./infrastructure/db";

const stripe = require('stripe')('sk_test_51RFzqw1Aq8zBi2RikELAbnqFf669XWTe7n6oaJt1FCD0XvR3fmFr8eWxtdicA6aQYMi4wNTqljlZav8K7VnhQEP500gI3gLWMS');
const app = express();


app.use(express.json()); // For parsing JSON requests
app.use(clerkMiddleware());
//app.use(cors({ origin: "http://localhost:5173" }));
app.use(cors({ origin:"https://mebius-frontend-yasindug.netlify.app" }));

app.use("/api/products", productRouter);
app.use("/api/categories", categoryRouter);
app.use("/api/orders", orderRouter);
app.use("/api/payment", paymentsRouter);
app.use("/api/users", userRouter);

app.use(globalErrorHandlingMiddleware);

connectDB();
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
