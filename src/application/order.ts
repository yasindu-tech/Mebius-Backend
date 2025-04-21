import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import ValidationError from "../domain/errors/validation-error";
import Order from "../infrastructure/schemas/Order";
import NotFoundError from "../domain/errors/not-found-error";
import Address from "../infrastructure/schemas/Address";
import { CreateOrderDTO } from "../domain/dto/order";
import { isAuthenticated } from "../api/middleware/authentication-middleware";

export const createOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const result = CreateOrderDTO.safeParse(req.body);
    if (!result.success) {
      throw new ValidationError("Invalid order data");
    }

    const userId = req.auth.userId;

    const address = await Address.create({
      ...result.data.shippingAddress,
    });

    const order = await Order.create({
      userId,
      items: result.data.items,
      addressId: address._id,
    });

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const orders = await Order.find().populate({
      path: "addressId",
      model: "Address",
    }).populate({
      path: "items",
    });
    
    if (!orders) {
      throw new NotFoundError("Orders not found");
    }
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

export const getOrder = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const id = req.params.id;
    const order = await Order.findById(id).populate({
      path: "addressId",
      model: "Address",
    }).populate({
      path: "items",
    });
    if (!order) {
      throw new NotFoundError("Order not found");
    }
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};

export const getOrderByUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.auth.userId;
    const orders = await Order.find({ userId }).populate({ path: "addressId", model: "Address" });
    if (!orders) {
      throw new NotFoundError("Order not found");
    }
    res.status(200).json(orders);
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async(
  req: Request,
  res: Response,
  next: NextFunction

) => {
  try {
    const orderId = req.params.id;
    const { orderStatus } = req.body;

    const order = await Order.findByIdAndUpdate(orderId, {orderStatus}, { new: true });
    if (!order) {
      throw new NotFoundError("Order not found");
    }
    res.status(200).json(order);
  } catch (error) {
    next(error);
  }
};
