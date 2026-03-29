import prisma from "@/lib/prisma";

export async function getNextThreadIndex(boardKey: string): Promise<number> {
  const lastThread = await prisma.thread.findFirst({
    where: {
      board: {
        boardKey,
      },
    },
    orderBy: {
      threadIndex: "desc",
    },
    select: {
      threadIndex: true,
    },
  });

  return (lastThread?.threadIndex ?? 0) + 1;
}