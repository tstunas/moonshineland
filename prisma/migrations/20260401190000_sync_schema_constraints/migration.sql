-- DropForeignKey
ALTER TABLE `Post` DROP FOREIGN KEY `Post_userId_fkey`;

-- DropIndex
DROP INDEX `Post_userId_fkey` ON `Post`;

-- AlterTable
ALTER TABLE `AutoPost` MODIFY `author` VARCHAR(80) NOT NULL;

-- AlterTable
ALTER TABLE `Board` MODIFY `boardKey` VARCHAR(20) NOT NULL,
    MODIFY `name` VARCHAR(20) NOT NULL;

-- AlterTable
ALTER TABLE `Post` MODIFY `userId` INTEGER NULL;

-- AlterTable
ALTER TABLE `Thread` MODIFY `postLimit` INTEGER NOT NULL DEFAULT 1001,
    MODIFY `postUpdatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX `Board_name_key` ON `Board`(`name`);

-- AddForeignKey
ALTER TABLE `Post` ADD CONSTRAINT `Post_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
