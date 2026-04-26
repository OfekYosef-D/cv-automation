/*
  Warnings:

  - A unique constraint covering the columns `[workosId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'WORKOS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarUrl" TEXT,
ADD COLUMN     "provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
ADD COLUMN     "workosId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_workosId_key" ON "User"("workosId");
