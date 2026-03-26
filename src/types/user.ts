export interface User {
  id: number;
  avatarUrl: string;
  username: string;
  email: string;
  passwordHash: string;
  lastLoginAt: string | null;
  suspendedUntil: string | null;
  isForeigner: boolean;
  isAdultVerified: boolean;
  roles: string[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}
