-- Add 'size_table' to the form_fields type check constraint
-- Run this in Supabase Dashboard > SQL Editor

-- Step 1: Drop the existing constraint
ALTER TABLE public.form_fields DROP CONSTRAINT IF EXISTS form_fields_type_check;

-- Step 2: Re-add the constraint with 'size_table' included
ALTER TABLE public.form_fields ADD CONSTRAINT form_fields_type_check
CHECK (type IN (
  'short_text',
  'long_text',
  'email',
  'number',
  'checkbox',
  'radio',
  'dropdown',
  'date',
  'time',
  'file',
  'image',
  'text_block',
  'consent',
  'english_text',
  'dhivehi_text',
  'section_header',
  'size_table'
));
