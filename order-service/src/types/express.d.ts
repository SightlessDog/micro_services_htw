export interface AuthUser {
  id: string;
  email?: string;
  roles: string[];
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user: AuthUser;
    }
  }
}

export {};
