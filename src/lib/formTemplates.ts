import { FormFieldType } from '@/types'

export interface TemplateField {
  type: FormFieldType
  label: string
  placeholder: string | null
  required: boolean
  options: any
  order_index: number
}

export interface FormTemplate {
  id: string
  name: string
  description: string
  language: 'en' | 'dv'
  emoji: string
  category: string
  fields: TemplateField[]
  formDefaults: {
    title: string
    description: string
  }
}

export const formTemplates: FormTemplate[] = [
  {
    id: 'jersey-ordering',
    name: 'Jersey Ordering Form',
    description: 'Collect jersey orders including size, quantity, and player details.',
    language: 'en',
    emoji: '👕',
    category: 'Sports',
    formDefaults: {
      title: 'Jersey Ordering Form',
      description: 'Please fill in your jersey order details below. All required fields are marked with an asterisk (*).',
    },
    fields: [
      {
        type: 'image',
        label: 'Team / Club Logo',
        placeholder: null,
        required: false,
        options: {
          imageUrl: '',
          altText: 'Team or Club Logo',
        },
        order_index: 0,
      },
      {
        type: 'short_text',
        label: 'Full Name',
        placeholder: 'Enter your full name',
        required: true,
        options: null,
        order_index: 1,
      },
      {
        type: 'number',
        label: 'Jersey Number',
        placeholder: 'e.g. 7',
        required: false,
        options: null,
        order_index: 2,
      },
      {
        type: 'size_table',
        label: 'Size Order Details',
        placeholder: null,
        required: false,
        options: {
          categories: [
            { name: 'Kids', sizes: ['4XS', '3XS', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL'] },
            { name: 'Adults', sizes: ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL'] },
            { name: 'Muslimah', sizes: ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', '6XL', '7XL', '8XL'] },
            { name: 'Baby Romper', sizes: ['XS', 'S', 'M', 'L', 'XL'] },
            { name: 'Ladies', sizes: ['2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'] },
            { name: 'Kids Muslimah', sizes: ['3XS', '2XS', 'XS', 'S', 'M', 'L', 'XL', '2XL'] },
          ],
          note: 'Enter the quantity for each size you need. Leave blank or enter 0 for sizes you do not need.',
        },
        order_index: 3,
      },
      {
        type: 'dropdown',
        label: 'Jersey Size',
        placeholder: null,
        required: true,
        options: {
          items: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        },
        order_index: 4,
      },
      {
        type: 'short_text',
        label: 'Contact Number',
        placeholder: 'Enter your phone number',
        required: true,
        options: null,
        order_index: 5,
      },
    ],
  },
]

export function getTemplateById(id: string): FormTemplate | undefined {
  return formTemplates.find((t) => t.id === id)
}
