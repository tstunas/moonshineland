import { getCurrentUser } from "@/features/auth/queries";
import prisma from "@/lib/prisma";

import type {
  AutoPostIntervalSeconds,
  AutoPostPayload,
  AutoPostSchedulePayload,
} from "./types";
import { AUTO_POST_INTERVAL_OPTIONS } from "./types";

function getAutoPostScheduleDelegate() {
  const delegate = (prisma as unknown as { autoPostSchedule?: unknown })
    .autoPostSchedule;

  if (!delegate) {
    return null;
  }

  return delegate as {
    findUnique: (args: unknown) => Promise<AutoPostSchedulePayload | null>;
    upsert: (args: unknown) => Promise<AutoPostSchedulePayload>;
  };
}

export async function resolveAutoPostOwnerContext(
  boardKey: string,
  threadIndex: number,
) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.id) {
    return { error: "로그인 후 사용할 수 있습니다." } as const;
  }

  const userId = Number(currentUser.id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return { error: "유효하지 않은 사용자 정보입니다." } as const;
  }

  const thread = await prisma.thread.findFirst({
    where: {
      threadIndex,
      board: {
        boardKey,
      },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!thread) {
    return { error: "존재하지 않는 스레드입니다." } as const;
  }

  if (!thread.userId || thread.userId !== userId) {
    return { error: "자동투하 관리는 스레드 주인만 사용할 수 있습니다." } as const;
  }

  return {
    userId,
    thread,
  } as const;
}

export async function listAutoPostsByThreadId(
  threadId: number,
): Promise<AutoPostPayload[]> {
  const autoPosts = await prisma.autoPost.findMany({
    where: {
      threadId,
    },
    include: {
      autoPostImages: {
        select: {
          id: true,
          imageUrl: true,
          sortOrder: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
    orderBy: {
      autoPostSequence: "asc",
    },
  });

  return autoPosts;
}

export function isValidAutoPostInterval(
  value: number,
): value is AutoPostIntervalSeconds {
  return AUTO_POST_INTERVAL_OPTIONS.includes(value as AutoPostIntervalSeconds);
}

export async function getAutoPostScheduleByThreadId(
  threadId: number,
): Promise<AutoPostSchedulePayload | null> {
  const delegate = getAutoPostScheduleDelegate();
  if (!delegate) {
    return null;
  }

  const schedule = await delegate.findUnique({
    where: {
      threadId,
    },
  });

  return schedule;
}

export async function upsertAutoPostScheduleByThreadId(input: {
  threadId: number;
  userId: number;
  intervalSeconds: AutoPostIntervalSeconds;
  orderMode: "sequence" | "random";
  stopWhenArchived: boolean;
}) {
  const delegate = getAutoPostScheduleDelegate();
  if (!delegate) {
    throw new Error("AUTO_POST_SCHEDULE_MODEL_NOT_READY");
  }

  const schedule = await delegate.upsert({
    where: {
      threadId: input.threadId,
    },
    create: {
      threadId: input.threadId,
      userId: input.userId,
      intervalSeconds: input.intervalSeconds,
      orderMode: input.orderMode,
      stopWhenArchived: input.stopWhenArchived,
      isEnabled: false,
      stoppedAt: new Date(),
    },
    update: {
      userId: input.userId,
      intervalSeconds: input.intervalSeconds,
      orderMode: input.orderMode,
      stopWhenArchived: input.stopWhenArchived,
    },
  });

  return schedule;
}
