export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type FormFieldType =
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'number'
  | 'checkbox'
  | 'radio'
  | 'dropdown'
  | 'date'
  | 'time'
  | 'file'
  | 'image'
  | 'text_block'
  | 'consent'
  | 'english_text'
  | 'dhivehi_text'
  | 'section_header'

export interface Form {
  id: string
  user_id: string
  title: string
  description: string | null
  is_published: boolean
  is_accepting_responses: boolean
  closes_at: string | null
  slug: string
  created_at: string
  updated_at: string
  settings: Json | null
}

export interface FormField {
  id: string
  form_id: string
  type: FormFieldType
  label: string
  placeholder: string | null
  required: boolean
  options: Json | null
  order_index: number
  created_at: string
}

export interface FormResponse {
  id: string
  form_id: string
  submitted_at: string
  metadata: Json | null
}

export interface FormAnswer {
  id: string
  response_id: string
  field_id: string
  value: Json
  created_at: string
}
