-- AlterTable: Add ban fields to users
ALTER TABLE `users` ADD COLUMN `ban_reason` TEXT NULL;
ALTER TABLE `users` ADD COLUMN `ban_expires_at` DATETIME(3) NULL;

-- AlterTable: Add image_urls to posts
ALTER TABLE `posts` ADD COLUMN `image_urls` TEXT NULL;

-- AlterTable: Add image_urls to comments
ALTER TABLE `comments` ADD COLUMN `image_urls` TEXT NULL;
