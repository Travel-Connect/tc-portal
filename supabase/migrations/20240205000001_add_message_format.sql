-- Add format column to chat_messages for HTML/Markdown tracking
-- Default to 'markdown' for backward compatibility with existing messages

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'chat_messages' AND column_name = 'format'
  ) THEN
    ALTER TABLE public.chat_messages
    ADD COLUMN format TEXT NOT NULL DEFAULT 'markdown'
    CHECK (format IN ('markdown', 'html'));
  END IF;
END $$;

COMMENT ON COLUMN public.chat_messages.format IS 'Content format: markdown (legacy) or html (TipTap)';

-- Index for potential future queries filtering by format
CREATE INDEX IF NOT EXISTS idx_chat_messages_format ON public.chat_messages(format);
