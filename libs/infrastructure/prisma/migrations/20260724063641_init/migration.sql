-- CreateTable
CREATE TABLE "shortened_urls" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "original_url" TEXT NOT NULL,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_clicked_at" TIMESTAMP(3),

    CONSTRAINT "shortened_urls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shortened_urls_code_key" ON "shortened_urls"("code");

-- CreateIndex
CREATE UNIQUE INDEX "shortened_urls_original_url_key" ON "shortened_urls"("original_url");
