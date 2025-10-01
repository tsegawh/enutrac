/*
  Warnings:

  - A unique constraint covering the columns `[subscriptionId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `payments` ADD COLUMN `subscriptionId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `payments_subscriptionId_key` ON `payments`(`subscriptionId`);

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_subscriptionId_fkey` FOREIGN KEY (`subscriptionId`) REFERENCES `subscriptions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
