-- CreateTable
CREATE TABLE `AdminAuditLog` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `action` VARCHAR(80) NOT NULL,
  `targetType` VARCHAR(40) NOT NULL,
  `targetIds` JSON NOT NULL,
  `summary` VARCHAR(255) NOT NULL,
  `details` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `adminUserId` INTEGER NOT NULL,

  INDEX `AdminAuditLog_createdAt_idx`(`createdAt`),
  INDEX `AdminAuditLog_targetType_createdAt_idx`(`targetType`, `createdAt`),
  INDEX `AdminAuditLog_adminUserId_createdAt_idx`(`adminUserId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AdminAuditLog`
  ADD CONSTRAINT `AdminAuditLog_adminUserId_fkey`
  FOREIGN KEY (`adminUserId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
