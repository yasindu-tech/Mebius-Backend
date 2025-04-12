
import { clerkClient } from "@clerk/clerk-sdk-node";
import { NextFunction, Request, Response } from "express";

export const DELETE = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const  userId = req.params.id;

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


export const getUserDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const userId = req.params.id;
  try {
    const user = await clerkClient.users.getUser(userId);
    if (!user) {
      res.status(404).json({ error: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Error fetching user details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
