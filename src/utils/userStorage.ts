import bcrypt from "bcrypt";
import { User, UserCredentials } from "../types/user";
import crypto from "crypto";

// In-memory user storage (replace with database in production)
class UserStorage {
  private users: Map<string, User> = new Map();
  private usersByUsername: Map<string, string> = new Map(); // username -> userId

  async createUser(credentials: UserCredentials): Promise<User> {
    // Check if username already exists
    for (const user of this.users.values()) {
      if (user.email === credentials.email) {
        throw new Error("Email already exists");
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(credentials.password, 10);

    // Generate user ID
    const userId = crypto.randomUUID();

    // Create user object
    const user: User = {
      id: userId,
      name: credentials.name,
      email: credentials.email,
      passwordHash,
      alpacaApiKey: credentials.alpacaApiKey,
      alpacaSecretKey: credentials.alpacaSecretKey,
      alpacaPaperUrl: credentials.alpacaPaperUrl || "https://paper-api.alpaca.markets",
      createdAt: new Date(),
    };

    // Store user
    this.users.set(userId, user);
    this.usersByUsername.set(credentials.name, userId);

    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    for (const user of this.users.values()) {
      if (user.email === email) return user;
    }
    return null;
  }



  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const userId = this.usersByUsername.get(username);
    if (!userId) return null;
    return this.users.get(userId) || null;
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async updateUserCredentials(
    userId: string,
    credentials: Partial<Pick<User, "alpacaApiKey" | "alpacaSecretKey" | "alpacaPaperUrl">>
  ): Promise<User | null> {
    const user = this.users.get(userId);
    if (!user) return null;

    if (credentials.alpacaApiKey) user.alpacaApiKey = credentials.alpacaApiKey;
    if (credentials.alpacaSecretKey) user.alpacaSecretKey = credentials.alpacaSecretKey;
    if (credentials.alpacaPaperUrl) user.alpacaPaperUrl = credentials.alpacaPaperUrl;

    this.users.set(userId, user);
    return user;
  }

  async deleteUser(userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) return false;

    this.users.delete(userId);
    this.usersByUsername.delete(user.name);
    return true;
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }
}

export const userStorage = new UserStorage();

