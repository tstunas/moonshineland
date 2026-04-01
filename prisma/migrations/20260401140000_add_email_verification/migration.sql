-- AlterTable: 이메일 인증 필드 추가
ALTER TABLE `User`
  ADD COLUMN `emailVerifiedAt`                DATETIME(3) NULL,
  ADD COLUMN `emailVerificationTokenHash`     VARCHAR(64) NULL,
  ADD COLUMN `emailVerificationExpiresAt`     DATETIME(3) NULL;

-- 기존 사용자는 이미 인증된 것으로 처리
UPDATE `User` SET `emailVerifiedAt` = `createdAt` WHERE `emailVerifiedAt` IS NULL;
