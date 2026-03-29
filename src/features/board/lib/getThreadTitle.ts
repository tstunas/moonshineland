import prisma from "@/lib/prisma";

/**
 * 인증 없이 스레드 제목만 조회합니다.
 * generateMetadata 전용 — 접근 제어가 불필요한 메타데이터 용도로만 사용하세요.
 */
export async function getThreadTitle(
  boardKey: string,
  threadIndex: number,
): Promise<string | null> {
  if (!Number.isInteger(threadIndex) || threadIndex <= 0) return null;

  const thread = await prisma.thread.findFirst({
    where: { threadIndex, board: { boardKey } },
    select: { title: true },
  });

  return thread?.title ?? null;
}
