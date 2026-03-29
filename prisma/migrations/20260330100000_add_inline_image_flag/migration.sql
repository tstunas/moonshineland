-- AlterTable
ALTER TABLE `Post`
  ADD COLUMN `isInlineImage` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `AutoPost`
  ADD COLUMN `isInlineImage` BOOLEAN NOT NULL DEFAULT false;
