export interface Thread {
  id: number;
  boardKey: string;
  threadIndex: number;
  title: string;
  author: string;
  idcode: string;
  postCount: number;
  postLimit: number;
  passwordHash: string | null;
  isAdultOnly: boolean;
  isHidden: boolean;
  isSecret: boolean;
  isPrivate: boolean;
  isChat: boolean;
  isArchive: boolean;
  user: number | null;
  collaborators: number[];
  joinedUsers: number[];
  bannedUsers: number[];
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}
