-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Generation_userId_createdAt_idx" ON "Generation"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "Job_userId_createdAt_idx" ON "Job"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TranscriptionTask_userId_createdAt_idx" ON "TranscriptionTask"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "TranslationTask_userId_createdAt_idx" ON "TranslationTask"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "GenerationJob_userId_createdAt_idx" ON "GenerationJob"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "UserSession_userId_createdAt_idx" ON "UserSession"("userId", "createdAt" DESC);
