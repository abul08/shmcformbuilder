import { Form, Json } from '@/types'

export interface FormSettings {
    header_language?: 'en' | 'dv'
    title_dv?: string
    description_dv?: string
    [key: string]: any
}

/**
 * Safely parses and retrieves form settings.
 * Handles cases where settings might be a JSON string or already an object.
 */
export function safeGetSettings(form: Form | { settings: Json | null }): FormSettings {
    if (!form.settings) {
        return {}
    }

    if (typeof form.settings === 'string') {
        try {
            return JSON.parse(form.settings) as FormSettings
        } catch (e) {
            console.error('Failed to parse form settings:', e)
            return {}
        }
    }

    return form.settings as FormSettings
}
