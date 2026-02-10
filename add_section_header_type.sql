-- Remove the old check constraint
ALTER TABLE public.form_fields DROP CONSTRAINT IF EXISTS form_fields_type_check;

-- Add the new check constraint including 'section_header'
ALTER TABLE public.form_fields ADD CONSTRAINT form_fields_type_check 
CHECK (type IN ('short_text', 'long_text', 'email', 'number', 'checkbox', 'radio', 'dropdown', 'date', 'time', 'file', 'image', 'text_block', 'consent', 'english_text', 'dhivehi_text', 'section_header'));
