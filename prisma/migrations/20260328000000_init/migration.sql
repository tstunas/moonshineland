-- CreateTable
CREATE TABLE `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `avatarUrl` VARCHAR(512) NOT NULL DEFAULT '',
    `username` VARCHAR(50) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `suspendedUntil` DATETIME(3) NULL,
    `isForeigner` BOOLEAN NOT NULL DEFAULT false,
    `isAdultVerified` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,
    `preferences` JSON NOT NULL DEFAULT '{}',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Announcement` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `rawContent` LONGTEXT NOT NULL,
    `contentType` ENUM('text', 'aa', 'novel', 'line') NOT NULL DEFAULT 'text',
    `isHidden` BOOLEAN NOT NULL DEFAULT false,
    `isAdultOnly` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Board` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `boardKey` VARCHAR(64) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` TEXT NOT NULL DEFAULT '',
    `passwordHash` VARCHAR(255) NULL,
    `isAdultOnly` BOOLEAN NOT NULL DEFAULT false,
    `isHidden` BOOLEAN NOT NULL DEFAULT false,
    `isSecret` BOOLEAN NOT NULL DEFAULT false,
    `isPrivate` BOOLEAN NOT NULL DEFAULT false,
    `isBasic` BOOLEAN NOT NULL DEFAULT false,
    `isArchive` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `userId` INTEGER NULL,

    UNIQUE INDEX `Board_boardKey_key`(`boardKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BoardCollaborator` (
    `boardId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `BoardCollaborator_boardId_userId_idx`(`boardId`, `userId`),
    PRIMARY KEY (`boardId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BoardMember` (
    `boardId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `BoardMember_boardId_userId_idx`(`boardId`, `userId`),
    PRIMARY KEY (`boardId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BoardBan` (
    `boardId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `BoardBan_boardId_userId_idx`(`boardId`, `userId`),
    PRIMARY KEY (`boardId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Thread` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `threadIndex` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `author` VARCHAR(80) NOT NULL,
    `idcode` VARCHAR(32) NOT NULL,
    `postCount` INTEGER NOT NULL DEFAULT 0,
    `postLimit` INTEGER NOT NULL DEFAULT 500,
    `passwordHash` VARCHAR(255) NULL,
    `isAdultOnly` BOOLEAN NOT NULL DEFAULT false,
    `isHidden` BOOLEAN NOT NULL DEFAULT false,
    `isSecret` BOOLEAN NOT NULL DEFAULT false,
    `isPrivate` BOOLEAN NOT NULL DEFAULT false,
    `isChat` BOOLEAN NOT NULL DEFAULT false,
    `isArchive` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `postUpdatedAt` DATETIME(3) NOT NULL,
    `boardId` INTEGER NOT NULL,
    `userId` INTEGER NULL,

    UNIQUE INDEX `Thread_boardId_threadIndex_key`(`boardId`, `threadIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ThreadCollaborator` (
    `threadId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `ThreadCollaborator_userId_idx`(`userId`),
    PRIMARY KEY (`threadId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ThreadMember` (
    `threadId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `ThreadMember_threadId_userId_idx`(`threadId`, `userId`),
    PRIMARY KEY (`threadId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ThreadBan` (
    `threadId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    INDEX `ThreadBan_userId_idx`(`userId`),
    PRIMARY KEY (`threadId`, `userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Post` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `postOrder` INTEGER NOT NULL,
    `author` VARCHAR(80) NOT NULL,
    `idcode` VARCHAR(32) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `rawContent` LONGTEXT NOT NULL,
    `contentType` ENUM('text', 'aa', 'novel', 'line') NOT NULL DEFAULT 'text',
    `isHidden` BOOLEAN NOT NULL DEFAULT false,
    `isEdited` BOOLEAN NOT NULL DEFAULT false,
    `isAutoPost` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `contentUpdatedAt` DATETIME(3) NULL,
    `threadId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `Post_threadId_postOrder_key`(`threadId`, `postOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PostImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `postId` INTEGER NOT NULL,
    `imageUrl` VARCHAR(512) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `PostImage_postId_sortOrder_key`(`postId`, `sortOrder`),
    INDEX `PostImage_postId_sortOrder_idx`(`postId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AutoPost` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `autoPostSequence` INTEGER NOT NULL,
    `author` VARCHAR(80) NOT NULL,
    `idcode` VARCHAR(32) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `rawContent` LONGTEXT NOT NULL,
    `contentType` ENUM('text', 'aa', 'novel', 'line') NOT NULL DEFAULT 'text',
    `isHidden` BOOLEAN NOT NULL DEFAULT false,
    `isEdited` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `contentUpdatedAt` DATETIME(3) NULL,
    `threadId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,

    UNIQUE INDEX `AutoPost_threadId_autoPostSequence_key`(`threadId`, `autoPostSequence`),
    INDEX `AutoPost_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AutoPostImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `autoPostId` INTEGER NOT NULL,
    `imageUrl` VARCHAR(512) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AutoPostImage_autoPostId_sortOrder_key`(`autoPostId`, `sortOrder`),
    INDEX `AutoPostImage_autoPostId_sortOrder_idx`(`autoPostId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Announcement` ADD CONSTRAINT `Announcement_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Board` ADD CONSTRAINT `Board_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BoardCollaborator` ADD CONSTRAINT `BoardCollaborator_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `Board`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BoardCollaborator` ADD CONSTRAINT `BoardCollaborator_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BoardMember` ADD CONSTRAINT `BoardMember_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `Board`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BoardMember` ADD CONSTRAINT `BoardMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BoardBan` ADD CONSTRAINT `BoardBan_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `Board`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BoardBan` ADD CONSTRAINT `BoardBan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Thread` ADD CONSTRAINT `Thread_boardId_fkey` FOREIGN KEY (`boardId`) REFERENCES `Board`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Thread` ADD CONSTRAINT `Thread_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ThreadCollaborator` ADD CONSTRAINT `ThreadCollaborator_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `Thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ThreadCollaborator` ADD CONSTRAINT `ThreadCollaborator_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ThreadMember` ADD CONSTRAINT `ThreadMember_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `Thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ThreadMember` ADD CONSTRAINT `ThreadMember_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ThreadBan` ADD CONSTRAINT `ThreadBan_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `Thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ThreadBan` ADD CONSTRAINT `ThreadBan_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `Thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PostImage` ADD CONSTRAINT `PostImage_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutoPost` ADD CONSTRAINT `AutoPost_threadId_fkey` FOREIGN KEY (`threadId`) REFERENCES `Thread`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutoPost` ADD CONSTRAINT `AutoPost_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AutoPostImage` ADD CONSTRAINT `AutoPostImage_autoPostId_fkey` FOREIGN KEY (`autoPostId`) REFERENCES `AutoPost`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE `PostContentHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `postId` INTEGER NOT NULL,
    `previousContent` LONGTEXT NOT NULL,
    `previousRawContent` LONGTEXT NOT NULL,
    `previousCreatedAt` DATETIME(3) NOT NULL,
    `previousContentUpdatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `PostContentHistory_postId_createdAt_idx`(`postId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Thread_boardId_isChat_isAdultOnly_threadIndex_idx` ON `Thread`(`boardId`, `isChat`, `isAdultOnly`, `threadIndex`);

-- CreateIndex
CREATE INDEX `Thread_boardId_title_idx` ON `Thread`(`boardId`, `title`);

-- CreateIndex
CREATE INDEX `Thread_boardId_author_idx` ON `Thread`(`boardId`, `author`);

-- CreateIndex
CREATE INDEX `Post_threadId_createdAt_idx` ON `Post`(`threadId`, `createdAt`);

-- CreateIndex
CREATE INDEX `Post_threadId_updatedAt_idx` ON `Post`(`threadId`, `updatedAt`);

-- AddForeignKey
ALTER TABLE `PostContentHistory` ADD CONSTRAINT `PostContentHistory_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `Post`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
