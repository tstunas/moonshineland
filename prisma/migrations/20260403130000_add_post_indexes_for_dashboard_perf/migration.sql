-- Improve admin dashboard post stats/list performance
-- by helping COUNT/ORDER BY patterns on Post table.
CREATE INDEX `Post_isAutoPost_createdAt_idx` ON `Post`(`isAutoPost`, `createdAt`);
CREATE INDEX `Post_createdAt_idx` ON `Post`(`createdAt`);
