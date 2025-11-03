/*
  Warnings:

  - You are about to drop the column `subscriptionId` on the `payments` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `payments` DROP FOREIGN KEY `payments_subscriptionId_fkey`;

-- DropIndex
DROP INDEX `payments_subscriptionId_key` ON `payments`;

-- AlterTable
ALTER TABLE `payments` DROP COLUMN `subscriptionId`,
    ADD COLUMN `invoiceNumber` VARCHAR(191) NULL,
    MODIFY `amount` DECIMAL(10, 2) NOT NULL,
    ALTER COLUMN `updatedAt` DROP DEFAULT;

-- AlterTable
ALTER TABLE `settings` ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `subscription_plans` MODIFY `price` DECIMAL(10, 2) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `payments_invoiceNumber_key` ON `payments`(`invoiceNumber`);

-- CreateIndex
CREATE INDEX `payments_invoiceNumber_idx` ON `payments`(`invoiceNumber`);
