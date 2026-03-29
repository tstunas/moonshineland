import { broadcastAutoPostFired, broadcastNewPost } from "@/lib/sse-store";
import prisma from "@/lib/prisma";
import type { Post } from "@/types/post";

const SCHEDULE_LOCK_WINDOW_MS = 25_000;
const POST_ORDER_RETRY = 5;

type SchedulerTickResult = {
  picked: number;
  posted: number;
  skipped: number;
  stopped: number;
  failed: number;
};

function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.slice(0, 255);
  }
  return "UNKNOWN";
}

function computeNextRunAt(now: Date, intervalSeconds: number): Date {
  return new Date(now.getTime() + intervalSeconds * 1000);
}

async function processDueSchedule(scheduleId: number): Promise<{
  status: "posted" | "skipped" | "stopped";
  boardKey?: string;
  threadIndex?: number;
  post?: Post;
  autoPostId?: number;
  autoPostSequence?: number;
}> {
  for (let attempt = 0; attempt < POST_ORDER_RETRY; attempt += 1) {
    const now = new Date();

    const schedule = await prisma.autoPostSchedule.findUnique({
      where: {
        id: scheduleId,
      },
      include: {
        thread: {
          select: {
            id: true,
            board: {
              select: {
                boardKey: true,
              },
            },
            threadIndex: true,
            isArchive: true,
            postLimit: true,
          },
        },
      },
    });

    if (!schedule) {
      return { status: "skipped" };
    }

    if (!schedule.isEnabled || !schedule.nextRunAt || schedule.nextRunAt > now) {
      await prisma.autoPostSchedule.update({
        where: {
          id: schedule.id,
        },
        data: {
          lockUntil: null,
        },
      });
      return { status: "skipped" };
    }

    if (schedule.pauseUntil && schedule.pauseUntil > now) {
      await prisma.autoPostSchedule.update({
        where: {
          id: schedule.id,
        },
        data: {
          lockUntil: null,
        },
      });
      return { status: "skipped" };
    }

    if (schedule.stopWhenArchived && schedule.thread.isArchive) {
      await prisma.autoPostSchedule.update({
        where: {
          id: schedule.id,
        },
        data: {
          isEnabled: false,
          stoppedAt: now,
          nextRunAt: null,
          lockUntil: null,
          lastError: "THREAD_ARCHIVED",
        },
      });
      return { status: "stopped" };
    }

    const autoPosts = await prisma.autoPost.findMany({
      where: {
        threadId: schedule.threadId,
      },
      include: {
        autoPostImages: {
          select: {
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

    if (autoPosts.length === 0) {
      await prisma.autoPostSchedule.update({
        where: {
          id: schedule.id,
        },
        data: {
          isEnabled: false,
          stoppedAt: now,
          nextRunAt: null,
          lockUntil: null,
          lastError: "AUTO_POST_TEMPLATE_EMPTY",
        },
      });
      return { status: "stopped" };
    }

    let selectedAutoPost = autoPosts[0];

    if (schedule.orderMode === "random") {
      const randomIndex = Math.floor(Math.random() * autoPosts.length);
      selectedAutoPost = autoPosts[randomIndex];
    } else {
      const targetSequence = schedule.nextAutoPostSequence ?? autoPosts[0].autoPostSequence;
      selectedAutoPost =
        autoPosts.find((item) => item.autoPostSequence >= targetSequence) ?? autoPosts[0];
    }

    const lastPost = await prisma.post.findFirst({
      where: {
        threadId: schedule.threadId,
      },
      orderBy: {
        postOrder: "desc",
      },
      select: {
        postOrder: true,
      },
    });

    const nextPostOrder = (lastPost?.postOrder ?? -1) + 1;

    if (nextPostOrder > schedule.thread.postLimit) {
      await prisma.autoPostSchedule.update({
        where: {
          id: schedule.id,
        },
        data: {
          isEnabled: false,
          stoppedAt: now,
          nextRunAt: null,
          lockUntil: null,
          lastError: "THREAD_POST_LIMIT_EXCEEDED",
        },
      });
      return { status: "stopped" };
    }

    try {
      const createdPost = await prisma.$transaction(async (tx) => {
        const post = await tx.post.create({
          data: {
            threadId: schedule.threadId,
            userId: schedule.userId,
            postOrder: nextPostOrder,
            author: selectedAutoPost.author,
            idcode: selectedAutoPost.idcode,
            content: selectedAutoPost.content,
            rawContent: selectedAutoPost.rawContent,
            contentType: selectedAutoPost.contentType,
            isEdited: false,
            isAutoPost: true,
            contentUpdatedAt: now,
            ...(selectedAutoPost.autoPostImages.length > 0
              ? {
                  postImages: {
                    create: selectedAutoPost.autoPostImages.map((image) => ({
                      imageUrl: image.imageUrl,
                      sortOrder: image.sortOrder,
                    })),
                  },
                }
              : {}),
          },
        });

        await tx.thread.update({
          where: {
            id: schedule.threadId,
          },
          data: {
            postCount: post.postOrder,
            postUpdatedAt: post.createdAt,
          },
        });

        // 사용된 자동투하 템플릿은 즉시 삭제한다.
        await tx.autoPost.delete({
          where: {
            id: selectedAutoPost.id,
          },
        });

        const remainingTemplates = await tx.autoPost.findMany({
          where: {
            threadId: schedule.threadId,
          },
          select: {
            autoPostSequence: true,
          },
          orderBy: {
            autoPostSequence: "asc",
          },
        });

        if (remainingTemplates.length === 0) {
          await tx.autoPostSchedule.update({
            where: {
              id: schedule.id,
            },
            data: {
              isEnabled: false,
              lockUntil: null,
              nextRunAt: null,
              nextAutoPostSequence: null,
              lastRunAt: now,
              lastPostedAt: now,
              stoppedAt: now,
              lastError: "AUTO_POST_TEMPLATE_EMPTY",
              runCount: {
                increment: 1,
              },
            },
          });

          return post;
        }

        let nextAutoPostSequence = remainingTemplates[0].autoPostSequence;
        if (schedule.orderMode === "sequence") {
          const nextTemplate =
            remainingTemplates.find(
              (item) => item.autoPostSequence > selectedAutoPost.autoPostSequence,
            ) ?? remainingTemplates[0];
          nextAutoPostSequence = nextTemplate.autoPostSequence;
        }

        await tx.autoPostSchedule.update({
          where: {
            id: schedule.id,
          },
          data: {
            lockUntil: null,
            nextRunAt: computeNextRunAt(now, schedule.intervalSeconds),
            nextAutoPostSequence: nextAutoPostSequence,
            lastRunAt: now,
            lastPostedAt: now,
            lastError: null,
            runCount: {
              increment: 1,
            },
          },
        });

        return post;
      });

      return {
        status: "posted",
        boardKey: schedule.thread.board.boardKey,
        threadIndex: schedule.thread.threadIndex,
        post: createdPost,
        autoPostId: selectedAutoPost.id,
        autoPostSequence: selectedAutoPost.autoPostSequence,
      };
    } catch (error) {
      const prismaError = error as { code?: string; meta?: { target?: unknown } };
      const conflict =
        prismaError.code === "P2002" &&
        (Array.isArray(prismaError.meta?.target)
          ? prismaError.meta?.target
              .map((value) => String(value).toLowerCase())
              .includes("postorder")
          : true);

      if (conflict && attempt < POST_ORDER_RETRY - 1) {
        continue;
      }

      throw error;
    }
  }

  await prisma.autoPostSchedule.update({
    where: {
      id: scheduleId,
    },
    data: {
      lockUntil: null,
    },
  });

  return { status: "skipped" };
}

export async function runAutoPostSchedulerTick(
  limit = 100,
): Promise<SchedulerTickResult> {
  const now = new Date();
  const lockUntil = new Date(now.getTime() + SCHEDULE_LOCK_WINDOW_MS);

  const candidates = await prisma.autoPostSchedule.findMany({
    where: {
      isEnabled: true,
      nextRunAt: {
        lte: now,
      },
      OR: [
        {
          pauseUntil: null,
        },
        {
          pauseUntil: {
            lte: now,
          },
        },
      ],
      AND: [
        {
          OR: [
            {
              lockUntil: null,
            },
            {
              lockUntil: {
                lt: now,
              },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      intervalSeconds: true,
    },
    orderBy: {
      nextRunAt: "asc",
    },
    take: Math.max(1, Math.min(limit, 500)),
  });

  const result: SchedulerTickResult = {
    picked: 0,
    posted: 0,
    skipped: 0,
    stopped: 0,
    failed: 0,
  };

  for (const candidate of candidates) {
    const locked = await prisma.autoPostSchedule.updateMany({
      where: {
        id: candidate.id,
        isEnabled: true,
        nextRunAt: {
          lte: now,
        },
        OR: [
          {
            lockUntil: null,
          },
          {
            lockUntil: {
              lt: now,
            },
          },
        ],
      },
      data: {
        lockUntil,
      },
    });

    if (locked.count <= 0) {
      continue;
    }

    result.picked += 1;

    try {
      const processed = await processDueSchedule(candidate.id);

      if (processed.status === "posted" && processed.post && processed.boardKey) {
        result.posted += 1;
        broadcastNewPost(processed.boardKey, processed.threadIndex!, processed.post);
        if (
          typeof processed.autoPostId === "number" &&
          typeof processed.autoPostSequence === "number"
        ) {
          broadcastAutoPostFired(processed.boardKey, processed.threadIndex!, {
            autoPostId: processed.autoPostId,
            autoPostSequence: processed.autoPostSequence,
            postId: processed.post.id,
            postOrder: processed.post.postOrder,
            createdAt: processed.post.createdAt.toISOString(),
          });
        }
        continue;
      }

      if (processed.status === "stopped") {
        result.stopped += 1;
        continue;
      }

      result.skipped += 1;
    } catch (error) {
      result.failed += 1;
      const message = sanitizeErrorMessage(error);
      await prisma.autoPostSchedule.update({
        where: {
          id: candidate.id,
        },
        data: {
          lockUntil: null,
          failCount: {
            increment: 1,
          },
          lastRunAt: now,
          lastError: message,
          nextRunAt: computeNextRunAt(now, candidate.intervalSeconds),
        },
      });
    }
  }

  return result;
}
