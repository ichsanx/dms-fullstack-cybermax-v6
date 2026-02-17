-- CreateIndex
CREATE INDEX "Document_createdById_idx" ON "Document"("createdById");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "PermissionRequest_documentId_idx" ON "PermissionRequest"("documentId");

-- CreateIndex
CREATE INDEX "PermissionRequest_requestedById_idx" ON "PermissionRequest"("requestedById");

-- CreateIndex
CREATE INDEX "PermissionRequest_status_idx" ON "PermissionRequest"("status");
