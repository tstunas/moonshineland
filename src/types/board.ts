import type { BoardModel } from "@/generated/prisma/models/Board";

export type Board = BoardModel;

export interface BoardMemberSets {
  collaborators: number[];
  joinedUsers: number[];
  bannedUsers: number[];
}
