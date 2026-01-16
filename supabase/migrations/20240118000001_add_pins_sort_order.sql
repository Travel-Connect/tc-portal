-- Add sort_order column to pins table for user-customizable pin ordering
ALTER TABLE public.pins
  ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

-- Create index for efficient ordering queries
CREATE INDEX idx_pins_user_sort ON public.pins(user_id, sort_order);

-- Update existing pins to have sequential sort_order based on created_at
WITH numbered AS (
  SELECT
    user_id,
    tool_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) - 1 AS new_order
  FROM public.pins
)
UPDATE public.pins p
SET sort_order = n.new_order
FROM numbered n
WHERE p.user_id = n.user_id AND p.tool_id = n.tool_id;
