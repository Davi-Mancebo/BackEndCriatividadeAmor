-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'PIX';

-- CreateIndex
CREATE INDEX "orders_customerId_idx" ON "orders"("customerId");

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
