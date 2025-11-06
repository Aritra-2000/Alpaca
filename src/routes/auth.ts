import { Router, Request, Response } from "express";
import { userStorage } from "../utils/userStorage";
import { generateToken, authenticateToken, AuthenticatedRequest } from "../utils/auth";
import { UserCredentials} from "../types/user";

const router = Router();

router.post("/register", async (req: Request, res: Response) => {
  try {
    const credentials: UserCredentials = req.body;

    if (!credentials.name || !credentials.email || !credentials.password) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["name", "email", "password"],
      });
    }

    const user = await userStorage.createUser(credentials);

    const token = generateToken({ userId: user.id, name: credentials.name, email: credentials.email });

    res.status(201).json({
      message: "Registration successful",
      token,
      user: {
        id: user.id,
        name: credentials.name,
        email: credentials.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    
    if (error instanceof Error) {
      if (error.message.includes("exists")) {
        return res.status(409).json({ 
          error: "Email already registered",
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
      return res.status(500).json({ 
        error: "Registration failed",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    res.status(500).json({ 
      error: "An unexpected error occurred during registration"
    });
  }
});


// Login request body type
interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}

// Login
router.post("/login", async (req: LoginRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    // Input validation
    if (!email || !password) {
      return res.status(400).json({
        error: "Email and password are required",
        field: !email ? "email" : "password"
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email format"
      });
    }

    console.log('All users in storage:', userStorage.getAllUsers());
  
    const user = await userStorage.getUserByEmail(email);
    console.log('Found user:', user ? { ...user, passwordHash: '***' } : null);
    
    const isValid = user ? await userStorage.verifyPassword(user, password) : false;
    console.log('Password valid:', isValid);
    
    if (!user || !isValid) {
      return res.status(401).json({ 
        error: "Invalid email or password",
        ...(process.env.NODE_ENV === 'development' && {
          _debug: {
            userExists: !!user,
            passwordValid: user ? 'checked' : 'not checked'
          }
        })
      });
    }
    const token = generateToken({ 
      userId: user.id, 
      name: user.name, 
      email: user.email 
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 
    });

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        hasAlpacaKeys: Boolean(user.alpacaApiKey && user.alpacaSecretKey)
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: "An error occurred during login",
      ...(process.env.NODE_ENV === 'development' && { 
        details: error instanceof Error ? error.message : 'Unknown error' 
      })
    });
  }
});

router.put("/credentials", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { alpacaApiKey, alpacaSecretKey, alpacaPaperUrl } = req.body;

    if (!alpacaApiKey || !alpacaSecretKey) {
      return res.status(400).json({
        error: "alpacaApiKey and alpacaSecretKey required",
      });
    }

    const updatedUser = await userStorage.updateUserCredentials(userId, {
      alpacaApiKey,
      alpacaSecretKey,
      alpacaPaperUrl,
    });

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    const { clearUserAlpacaInstance } = require("../utils/alpacaFactory");
    clearUserAlpacaInstance(userId);

    res.json({
      message: "Credentials updated successfully",
      user: {
        id: updatedUser.id,
        username: updatedUser.name,
        email: updatedUser.email,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

