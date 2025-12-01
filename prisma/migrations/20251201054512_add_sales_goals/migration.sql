-- CreateTable
CREATE TABLE "sales_goals" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_goals_year_month_idx" ON "sales_goals"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "sales_goals_month_year_key" ON "sales_goals"("month", "year");
