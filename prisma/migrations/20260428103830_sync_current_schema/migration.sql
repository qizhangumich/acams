/*
  Warnings:

  - A unique constraint covering the columns `[index]` on the table `Question` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `index` to the `Question` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "index" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Question_index_key" ON "Question"("index");

-- CreateIndex
CREATE INDEX "Question_index_idx" ON "Question"("index");
