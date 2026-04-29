-- CreateTable
CREATE TABLE "UserQuestionTag" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "question_id" INTEGER NOT NULL,
    "tag" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserQuestionTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserQuestionTag_user_id_tag_idx" ON "UserQuestionTag"("user_id", "tag");

-- CreateIndex
CREATE INDEX "UserQuestionTag_question_id_idx" ON "UserQuestionTag"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "UserQuestionTag_user_id_question_id_tag_key" ON "UserQuestionTag"("user_id", "question_id", "tag");

-- AddForeignKey
ALTER TABLE "UserQuestionTag" ADD CONSTRAINT "UserQuestionTag_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserQuestionTag" ADD CONSTRAINT "UserQuestionTag_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;
