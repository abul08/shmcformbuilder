-- Add published_at column to forms table
ALTER TABLE forms 
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- Update existing published forms to have published_at set to updated_at as a fallback
UPDATE forms 
SET published_at = updated_at 
WHERE is_published = true AND published_at IS NULL;
