import { DELETE } from "../application/user";
import express from "express";

import { isAuthenticated } from "./middleware/authentication-middleware";
export const userRouter = express.Router();

userRouter.route("/:id").delete(isAuthenticated, DELETE);