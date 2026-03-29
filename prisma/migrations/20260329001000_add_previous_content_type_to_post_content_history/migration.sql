-- AlterTable
ALTER TABLE `PostContentHistory`
  ADD COLUMN `previousContentType` ENUM('text', 'aa', 'novel', 'line') NOT NULL DEFAULT 'text';
