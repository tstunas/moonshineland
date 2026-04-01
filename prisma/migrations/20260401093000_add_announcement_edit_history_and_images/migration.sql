-- AlterTable
ALTER TABLE `Announcement`
  ADD COLUMN `isEdited` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `isInlineImage` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `contentUpdatedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `AnnouncementImage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `announcementId` INTEGER NOT NULL,
    `imageUrl` VARCHAR(512) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AnnouncementImage_announcementId_sortOrder_key`(`announcementId`, `sortOrder`),
    INDEX `AnnouncementImage_announcementId_sortOrder_idx`(`announcementId`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AnnouncementContentHistory` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `announcementId` INTEGER NOT NULL,
    `previousTitle` VARCHAR(80) NOT NULL,
    `previousContent` LONGTEXT NOT NULL,
    `previousRawContent` LONGTEXT NOT NULL,
    `previousContentType` ENUM('text', 'aa', 'novel', 'line') NOT NULL DEFAULT 'text',
    `previousCreatedAt` DATETIME(3) NOT NULL,
    `previousContentUpdatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AnnouncementContentHistory_announcementId_createdAt_idx`(`announcementId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AnnouncementImage` ADD CONSTRAINT `AnnouncementImage_announcementId_fkey` FOREIGN KEY (`announcementId`) REFERENCES `Announcement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AnnouncementContentHistory` ADD CONSTRAINT `AnnouncementContentHistory_announcementId_fkey` FOREIGN KEY (`announcementId`) REFERENCES `Announcement`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
