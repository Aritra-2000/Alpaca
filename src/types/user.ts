export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  alpacaApiKey: string;
  alpacaSecretKey: string;
  alpacaPaperUrl?: string;
  createdAt: Date;
}

export interface UserCredentials {
  name: string;
  email: string;
  password: string;
  alpacaApiKey: string;
  alpacaSecretKey: string;
  alpacaPaperUrl?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserPayload {
  userId: string;
  name: string;
  email: string;
}

