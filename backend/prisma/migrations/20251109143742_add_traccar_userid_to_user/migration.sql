-- AlterTable
ALTER TABLE `payments` ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `traccarUserId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `subscription_plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
