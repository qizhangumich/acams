-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('in_progress', 'submitted');

-- CreateTable
CREATE TABLE "ExamAttempt" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "ExamStatus" NOT NULL DEFAULT 'in_progress',
    "question_ids" INTEGER[],
    "answers" JSONB NOT NULL DEFAULT '{}',
    "duration_min" INTEGER NOT NULL DEFAULT 210,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "domain_stats" JSONB,

    CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewCard" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" INTEGER NOT NULL,
    "interval_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ease" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "reps" INTEGER NOT NULL DEFAULT 0,
    "lapses" INTEGER NOT NULL DEFAULT 0,
    "due_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExamAttempt_user_id_started_at_idx" ON "ExamAttempt"("user_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "ExamAttempt_user_id_status_idx" ON "ExamAttempt"("user_id", "status");

-- CreateIndex
CREATE INDEX "ReviewCard_user_id_due_at_idx" ON "ReviewCard"("user_id", "due_at");

-- CreateIndex
CREATE INDEX "ReviewCard_question_id_idx" ON "ReviewCard"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewCard_user_id_question_id_key" ON "ReviewCard"("user_id", "question_id");

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCard" ADD CONSTRAINT "ReviewCard_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewCard" ADD CONSTRAINT "ReviewCard_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
