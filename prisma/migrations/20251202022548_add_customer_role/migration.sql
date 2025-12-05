-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'CUSTOMER';

-- CreateIndex
CREATE INDEX "promotions_productId_active_startDate_endDate_idx" ON "promotions"("productId", "active", "startDate", "endDate");
