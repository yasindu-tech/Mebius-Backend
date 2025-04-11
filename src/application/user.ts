
import { clerkClient } from "@clerk/clerk-sdk-node";
import { NextFunction, Request, Response } from "express";

export const DELETE = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const  userId = req.params.userId; // Assuming userId is passed as a URL parameter

    if (!userId) {
      res.status(400).json({ error: "userId is required" });
    }

    await clerkClient.users.deleteUser(userId);
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
