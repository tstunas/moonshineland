-- DropIndex
DROP INDEX `Thread_boardId_isChat_isAdultOnly_updatedAt_threadIndex_idx` ON `Thread`;

-- DropIndex
DROP INDEX `Thread_isHidden_isChat_isAdultOnly_updatedAt_idx` ON `Thread`;

-- CreateIndex
CREATE INDEX `Thread_boardId_isChat_isAdultOnly_postUpdatedAt_threadIndex_idx` ON `Thread`(`boardId`, `isChat`, `isAdultOnly`, `postUpdatedAt`, `threadIndex`);

-- CreateIndex
CREATE INDEX `Thread_isHidden_isChat_isAdultOnly_postUpdatedAt_idx` ON `Thread`(`isHidden`, `isChat`, `isAdultOnly`, `postUpdatedAt`);
