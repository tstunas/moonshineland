import type { ThreadModel } from "@/generated/prisma/models/Thread";

export type Thread = ThreadModel;

export interface ThreadMemberSets {
  collaborators: number[];
  joinedUsers: number[];
  bannedUsers: number[];
}
