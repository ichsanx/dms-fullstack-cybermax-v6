-- DropForeignKey
ALTER TABLE "PermissionRequest" DROP CONSTRAINT "PermissionRequest_documentId_fkey";

-- AlterTable
ALTER TABLE "PermissionRequest" ADD COLUMN     "replaceFileUrl" TEXT;

-- AddForeignKey
ALTER TABLE "PermissionRequest" ADD CONSTRAINT "PermissionRequest_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
