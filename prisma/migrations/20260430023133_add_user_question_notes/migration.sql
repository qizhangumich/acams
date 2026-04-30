-- CreateTable
CREATE TABLE "UserQuestionNote" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserQuestionNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserQuestionNote_user_id_updated_at_idx" ON "UserQuestionNote"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "UserQuestionNote_question_id_idx" ON "UserQuestionNote"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuestionNote_user_id_question_id_key" ON "UserQuestionNote"("user_id", "question_id");

-- AddForeignKey
ALTER TABLE "UserQuestionNote" ADD CONSTRAINT "UserQuestionNote_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuestionNote" ADD CONSTRAINT "UserQuestionNote_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
