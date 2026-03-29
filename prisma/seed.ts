import prisma from "../src/lib/prisma";
import bcrypt from "bcrypt";

type SeedBoard = {
  boardKey: string;
  name: string;
  description: string;
  isBasic?: boolean;
  isArchive?: boolean;
  isAdultOnly?: boolean;
};

const DEFAULT_BOARDS: SeedBoard[] = [
  {
    boardKey: "anchor",
    name: "앵커판",
    description: "기본 앵커 게시판",
    isBasic: true,
  },
  {
    boardKey: "orpg",
    name: "OR판",
    description: "ORPG 관련 게시판",
    isBasic: true,
  },
  {
    boardKey: "test",
    name: "테스트판",
    description: "기능 테스트용 게시판",
    isBasic: true,
  },
  {
    boardKey: "trans",
    name: "번역판",
    description: "번역 작업 공유 게시판",
    isBasic: true,
  },
  {
    boardKey: "honor",
    name: "명예의 전당",
    description: "보관/기념 게시판",
    isArchive: true,
  },
];

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD?.trim();
const ADMIN_USERNAME = process.env.ADMIN_USERNAME?.trim() || "admin";

function assertAdminSeedEnv() {
  if (!ADMIN_EMAIL) {
    throw new Error("ADMIN_EMAIL 환경변수가 필요합니다.");
  }

  if (!ADMIN_PASSWORD) {
    throw new Error("ADMIN_PASSWORD 환경변수가 필요합니다.");
  }

  if (ADMIN_PASSWORD.length < 8) {
    throw new Error("ADMIN_PASSWORD는 8자 이상이어야 합니다.");
  }
}

async function main() {
  assertAdminSeedEnv();

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD!, 10);
  const adminUser = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL! },
    create: {
      email: ADMIN_EMAIL!,
      username: ADMIN_USERNAME,
      passwordHash,
      isAdmin: true,
      isActive: true,
    },
    update: {
      username: ADMIN_USERNAME,
      passwordHash,
      isAdmin: true,
      isActive: true,
    },
  });

  await prisma.$transaction(
    DEFAULT_BOARDS.map((board) =>
      prisma.board.upsert({
        where: { boardKey: board.boardKey },
        create: {
          boardKey: board.boardKey,
          name: board.name,
          description: board.description,
          isBasic: board.isBasic ?? false,
          isArchive: board.isArchive ?? false,
          isAdultOnly: board.isAdultOnly ?? false,
          userId: adminUser.id,
        },
        update: {
          name: board.name,
          description: board.description,
          isBasic: board.isBasic ?? false,
          isArchive: board.isArchive ?? false,
          isAdultOnly: board.isAdultOnly ?? false,
          userId: adminUser.id,
        },
      }),
    ),
  );

  console.info(`Seeded admin account: ${ADMIN_EMAIL}`);
  console.info(`Seeded default boards: ${DEFAULT_BOARDS.length}`);
}

main()
  .catch((error) => {
    console.error("Prisma seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
