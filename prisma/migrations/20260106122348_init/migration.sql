-- CreateEnum
CREATE TYPE "ProgressStatus" AS ENUM ('not_started', 'correct', 'wrong');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('user', 'assistant');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMP(3),
    "last_question_id" INTEGER,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" INTEGER NOT NULL,
    "domain" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_answers" TEXT[],
    "explanation" TEXT NOT NULL,
    "explanation_ai_en" TEXT,
    "explanation_ai_ch" TEXT,
    "is_complete" BOOLEAN NOT NULL DEFAULT false,
    "normalized_question" TEXT,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProgress" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" INTEGER NOT NULL,
    "status" "ProgressStatus" NOT NULL DEFAULT 'not_started',
    "selected_answer" TEXT[],
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionChat" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" INTEGER NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WrongBook" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" INTEGER NOT NULL,
    "wrong_count" INTEGER NOT NULL DEFAULT 1,
    "last_wrong_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WrongBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicLinkToken" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLinkToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_last_active_at_idx" ON "User"("last_active_at");

-- CreateIndex
CREATE INDEX "User_last_question_id_idx" ON "User"("last_question_id");

-- CreateIndex
CREATE INDEX "Question_domain_idx" ON "Question"("domain");

-- CreateIndex
CREATE INDEX "Question_is_complete_idx" ON "Question"("is_complete");

-- CreateIndex
CREATE INDEX "UserProgress_user_id_status_idx" ON "UserProgress"("user_id", "status");

-- CreateIndex
CREATE INDEX "UserProgress_user_id_updated_at_idx" ON "UserProgress"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "UserProgress_question_id_idx" ON "UserProgress"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserProgress_user_id_question_id_key" ON "UserProgress"("user_id", "question_id");

-- CreateIndex
CREATE INDEX "QuestionChat_user_id_question_id_created_at_idx" ON "QuestionChat"("user_id", "question_id", "created_at");

-- CreateIndex
CREATE INDEX "QuestionChat_question_id_idx" ON "QuestionChat"("question_id");

-- CreateIndex
CREATE INDEX "WrongBook_user_id_wrong_count_last_wrong_at_idx" ON "WrongBook"("user_id", "wrong_count" DESC, "last_wrong_at" DESC);

-- CreateIndex
CREATE INDEX "WrongBook_question_id_idx" ON "WrongBook"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "WrongBook_user_id_question_id_key" ON "WrongBook"("user_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "MagicLinkToken_token_key" ON "MagicLinkToken"("token");

-- CreateIndex
CREATE INDEX "MagicLinkToken_email_idx" ON "MagicLinkToken"("email");

-- CreateIndex
CREATE INDEX "MagicLinkToken_token_idx" ON "MagicLinkToken"("token");

-- CreateIndex
CREATE INDEX "MagicLinkToken_expires_at_idx" ON "MagicLinkToken"("expires_at");

-- CreateIndex
CREATE INDEX "MagicLinkToken_used_idx" ON "MagicLinkToken"("used");

-- CreateIndex
CREATE INDEX "MagicLinkToken_email_used_idx" ON "MagicLinkToken"("email", "used");

-- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProgress" ADD CONSTRAINT "UserProgress_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionChat" ADD CONSTRAINT "QuestionChat_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionChat" ADD CONSTRAINT "QuestionChat_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongBook" ADD CONSTRAINT "WrongBook_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WrongBook" ADD CONSTRAINT "WrongBook_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
