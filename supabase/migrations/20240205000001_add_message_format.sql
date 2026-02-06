-- Add format column to chat_messages for HTML/Markdown tracking
-- Default to 'markdown' for backward compatibility with existing messages

ALTER TABLE public.chat_messages
ADD COLUMN format TEXT NOT NULL DEFAULT 'markdown'
CHECK (format IN ('markdown', 'html'));

COMMENT ON COLUMN public.chat_messages.format IS 'Content format: markdown (legacy) or html (TipTap)';

-- Index for potential future queries filtering by format
CREATE INDEX idx_chat_messages_format ON public.chat_messages(format);
