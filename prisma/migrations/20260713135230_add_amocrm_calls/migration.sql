-- AlterEnum
ALTER TYPE "TelephonyProvider" ADD VALUE 'AMOCRM';

-- AlterTable
ALTER TABLE "calls" ADD COLUMN     "externalRecordingUrl" TEXT;
