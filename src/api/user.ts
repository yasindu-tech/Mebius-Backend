import { DELETE, getUserDetails } from "../application/user";
import express from "express";

import { isAuthenticated } from "./middleware/authentication-middleware";
export const userRouter = express.Router();

userRouter.route("/:id").delete( DELETE);
userRouter.route("/user/:id").get(getUserDetails)

