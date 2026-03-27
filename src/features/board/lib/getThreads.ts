import { Thread } from "@/types/thread";

export async function getThreads(boardKey: string): Promise<Thread[]> {
  if (boardKey !== "anchor") {
    return [];
  }

  return [
    {
      id: 1,
      threadIndex: 1,
      title: "첫 번째 스레드",
      author: "작성자1",
      idcode: "abc123",
      passwordHash: null,
      postCount: 10,
      postLimit: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
      postUpdatedAt: new Date(),
      boardId: 1,
      isAdultOnly: false,
      isArchive: false,
      isChat: false,
      isHidden: false,
      isPrivate: false,
      isSecret: false,
      userId: 1,
    },
  ];
}
