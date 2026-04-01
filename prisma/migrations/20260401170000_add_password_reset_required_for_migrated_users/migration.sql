ALTER TABLE `User`
  ADD COLUMN `passwordResetRequired` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `passwordResetTokenHash` VARCHAR(64) NULL,
  ADD COLUMN `passwordResetExpiresAt` DATETIME(3) NULL;
