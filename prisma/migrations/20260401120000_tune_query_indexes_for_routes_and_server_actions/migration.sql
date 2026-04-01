-- DropIndex
DROP INDEX `Thread_boardId_isChat_isAdultOnly_threadIndex_idx` ON `Thread`;

-- DropIndex
DROP INDEX `AutoPostSchedule_nextRunAt_idx` ON `AutoPostSchedule`;

-- CreateIndex
CREATE INDEX `Announcement_isHidden_isAdultOnly_createdAt_idx`
ON `Announcement`(`isHidden`, `isAdultOnly`, `createdAt`);

-- CreateIndex
CREATE INDEX `Thread_boardId_isChat_isAdultOnly_updatedAt_threadIndex_idx`
ON `Thread`(`boardId`, `isChat`, `isAdultOnly`, `updatedAt`, `threadIndex`);

-- CreateIndex
CREATE INDEX `Post_threadId_isHidden_postOrder_idx`
ON `Post`(`threadId`, `isHidden`, `postOrder`);

-- CreateIndex
CREATE INDEX `Thread_isHidden_isChat_isAdultOnly_updatedAt_idx`
ON `Thread`(`isHidden`, `isChat`, `isAdultOnly`, `updatedAt`);

-- CreateIndex
CREATE INDEX `Post_isHidden_isAutoPost_contentType_createdAt_idx`
ON `Post`(`isHidden`, `isAutoPost`, `contentType`, `createdAt`);
