-- Apply migration first, then run these EXPLAIN checks.
-- MySQL 8+: use EXPLAIN ANALYZE for actual execution metrics.

-- 1) Thread list (board page): boardId + flags + updatedAt/threadIndex sort
EXPLAIN FORMAT=JSON
SELECT id, threadIndex, title, updatedAt
FROM Thread
WHERE boardId = 1
  AND isChat = 0
  AND isAdultOnly = 0
ORDER BY updatedAt DESC, threadIndex DESC
LIMIT 20 OFFSET 0;

-- 2) Thread list (admin global): visibility/type/adult + updatedAt sort
EXPLAIN FORMAT=JSON
SELECT id, threadIndex, title, updatedAt
FROM Thread
WHERE isHidden = 0
  AND isChat = 0
  AND isAdultOnly = 0
ORDER BY updatedAt DESC
LIMIT 20 OFFSET 0;

-- 3) Post list (thread view): visibility + postOrder range/order
EXPLAIN FORMAT=JSON
SELECT id, postOrder, createdAt
FROM Post
WHERE threadId = 1
  AND isHidden = 0
  AND postOrder > 100
ORDER BY postOrder ASC
LIMIT 50;

-- 4) Post list (admin global): visibility/auto/contentType + createdAt sort
EXPLAIN FORMAT=JSON
SELECT id, postOrder, createdAt
FROM Post
WHERE isHidden = 0
  AND isAutoPost = 0
  AND contentType = 'text'
ORDER BY createdAt DESC
LIMIT 20 OFFSET 0;

-- 5) Announcement public list: hidden/adult + createdAt sort
EXPLAIN FORMAT=JSON
SELECT id, title, createdAt
FROM Announcement
WHERE isHidden = 0
  AND isAdultOnly = 0
ORDER BY createdAt DESC
LIMIT 30;
