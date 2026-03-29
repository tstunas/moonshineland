import prisma from "../src/lib/prisma";

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

async function main() {
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
        },
        update: {
          name: board.name,
          description: board.description,
          isBasic: board.isBasic ?? false,
          isArchive: board.isArchive ?? false,
          isAdultOnly: board.isAdultOnly ?? false,
        },
      }),
    ),
  );

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
