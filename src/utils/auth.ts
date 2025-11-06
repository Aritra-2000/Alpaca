import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import { UserPayload } from "../types/user";
import { userStorage } from "./userStorage";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export function generateToken(payload: UserPayload): string {
  const tokenPayload = {
    userId: payload.userId,
    name: payload.name,
    email: payload.email,
  };
  return jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): UserPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (typeof decoded === 'string' || !decoded) {
      return null;
    }
    
    // Ensure the decoded token has the required fields
    if (!decoded.userId || !decoded.email) {
      return null;
    }
    
    return {
      userId: decoded.userId as string,
      name: decoded.name as string,
      email: decoded.email as string
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ error: "Authorization header is required" });
      return;
    }

    // Extract token from 'Bearer <token>'
    const token = authHeader.split(" ")[1];
    if (!token) {
      res.status(401).json({ error: "Authentication token is required" });
      return;
    }

    // Verify token
    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ error: "Invalid or expired token. Please log in again." });
      return;
    }

    // Verify user still exists in storage
    const user = await userStorage.getUserById(payload.userId);
    if (!user) {
      res.status(401).json({ error: "User account not found" });
      return;
    }

    // Add user to request object
    req.user = {
      userId: user.id,
      name: user.name,
      email: user.email
    };
    
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ 
      error: "An error occurred during authentication",
      details: process.env.NODE_ENV === 'development' 
        ? error instanceof Error ? error.message : String(error)
        : undefined
    });
  }
}

