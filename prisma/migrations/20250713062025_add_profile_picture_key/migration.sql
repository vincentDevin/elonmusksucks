/*
  Warnings:

  - You are about to drop the column `maxStreak` on the `UserStats` table. All the data in the column will be lost.
  - You are about to drop the column `parlaysStarted` on the `UserStats` table. All the data in the column will be lost.
  - You are about to drop the column `streak` on the `UserStats` table. All the data in the column will be lost.
  - Made the column `totalParlays` on table `UserStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `parlaysLost` on table `UserStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `totalParlayLegs` on table `UserStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `parlayLegsWon` on table `UserStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `parlayLegsLost` on table `UserStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `currentStreak` on table `UserStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `longestStreak` on table `UserStats` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profilePictureKey" TEXT;
