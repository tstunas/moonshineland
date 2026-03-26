export interface Board {
  id: number;
  boardKey: string;
  name: string;
  description: string;
  passwordHash: string | null;
  isAdultOnly: boolean;
  isHidden: boolean;
  isSecret: boolean;
  isPrivate: boolean;
  isBasic: boolean;
  isArchive: boolean;
  user: number | null;
  collaborators: number[];
  joinedUsers: number[];
  bannedUsers: number[];
  createdAt: string;
  updatedAt: string;
}
