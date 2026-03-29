-- CreateTable
CREATE TABLE `AutoPostSchedule` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `isEnabled` BOOLEAN NOT NULL DEFAULT false,
    `intervalSeconds` INTEGER NOT NULL DEFAULT 60,
    `orderMode` ENUM('sequence', 'random') NOT NULL DEFAULT 'sequence',
    `stopWhenArchived` BOOLEAN NOT NULL DEFAULT true,
    `nextAutoPostSequence` INTEGER NULL,
    `nextRunAt` DATETIME(3) NULL,
    `pauseUntil` DATETIME(3) NULL,
    `lockUntil` DATETIME(3) NULL,
    `lastRunAt` DATETIME(3) NULL,
    `lastPostedAt` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `stoppedAt` DATETIME(3) NULL,
    `lastError` VARCHAR(255) NULL,
    `runCount` INTEGER NOT NULL DEFAULT 0,
    `failCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `threadId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `AutoPostSchedule_threadId_key`(`threadId`),
    INDEX `AutoPostSchedule_isEnabled_nextRunAt_lockUntil_idx`(`isEnabled`, `nextRunAt`, `lockUntil`),
    INDEX `AutoPostSchedule_nextRunAt_idx`(`nextRunAt`),
    INDEX `AutoPostSchedule_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AutoPostSchedule` ADD CONSTRAINT `AutoPostSchedule_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `Thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutoPostSchedule` ADD CONSTRAINT `AutoPostSchedule_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
