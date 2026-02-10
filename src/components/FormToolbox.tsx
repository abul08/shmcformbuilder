'use client'

import { FormFieldType } from '@/types'
import {
    Type,
    AlignLeft,
    Mail,
    Hash,
    Calendar,
    CheckSquare,
    CircleDot,
    List,
    Upload,
    Plus,
    Image as ImageIcon,
    Pilcrow,
    Clock,
    Loader2
} from 'lucide-react'
import { useState } from 'react'

interface FormToolboxProps {
    onAddField: (type: FormFieldType, options?: any) => Promise<void>
    variant?: 'default' | 'dhivehi'
    className?: string
    isModal?: boolean
}

export default function FormToolbox({ onAddField, variant = 'default', className, isModal = false }: FormToolboxProps) {
    const [addingType, setAddingType] = useState<string | null>(null);

    const handleFieldClick = async (type: string, options?: any) => {
        if (addingType) return;
        setAddingType(type === 'english_answer' ? 'short_text' : type); // Use 'short_text' loading state for english_answer
        try {
            await onAddField(type as FormFieldType, options);
        } finally {
            setAddingType(null);
        }
    };
    const textFields: { type: string, label: string, icon: any, description: string, options?: any }[] = [
        { type: 'short_text', label: variant === 'dhivehi' ? 'Short Text (Dhivehi)' : 'Short Text', icon: Type, description: 'Single line input' },
    ]

    if (variant === 'dhivehi') {
        textFields.push(
            { type: 'english_text', label: 'Short Text (English)', icon: Type, description: 'LTR English input' },
            { type: 'short_text', options: { is_english_answer: true }, label: 'Short Text (English Answer)', icon: Type, description: 'Dhivehi Label, English Input' }
        )
    } else {
        textFields.push({ type: 'dhivehi_text', label: 'Short Text (Dhivehi)', icon: Type, description: 'RTL Dhivehi input' })
    }

    textFields.push(
        { type: 'long_text', label: 'Long Text', icon: AlignLeft, description: 'Multi-line text area' },
        { type: 'email', label: 'Email', icon: Mail, description: 'Email address validation' },
        { type: 'number', label: 'Number', icon: Hash, description: 'Numeric input' }
    )

    const fieldGroups = [
        {
            title: 'Text Fields',
            items: textFields
        },
        {
            title: 'Choices',
            items: [
                { type: 'radio', label: 'Single Choice', icon: CircleDot, description: 'Select one option' },
                { type: 'checkbox', label: 'Multiple Choice', icon: CheckSquare, description: 'Select multiple options' },
                { type: 'dropdown', label: 'Dropdown', icon: List, description: 'Select from a list' },
            ]
        },
        {
            title: 'Advanced',
            items: [
                { type: 'date', label: 'Date', icon: Calendar, description: 'Date picker' },
                { type: 'time', label: 'Time', icon: Clock, description: 'Time selector' },
                { type: 'file', label: 'File Upload', icon: Upload, description: 'Allow file attachments' },
                { type: 'image', label: 'Image', icon: ImageIcon, description: 'Embed an image' },
                { type: 'section_header', label: 'Section Header', icon: Type, description: 'Add a section break' },
                { type: 'text_block', label: 'Text Block', icon: Pilcrow, description: 'Static text and heading' },
                { type: 'consent', label: 'Consent', icon: CheckSquare, description: 'Terms agreement checkbox' },
            ]
        }
    ]

    return (
        <div className={`bg-white/5 rounded-lg ring-1 ring-white/10 p-4 ${className || ''}`}>
            {!isModal && (
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                    <Plus className="h-4 w-4 text-primary" />
                    Add Fields
                </h3>
            )}

            <div className="space-y-6">
                {fieldGroups.map((group, groupIdx) => (
                    <div key={groupIdx}>
                        <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2 px-1">
                            {group.title}
                        </h4>
                        <div className="grid grid-cols-1 gap-2">
                            {group.items.map((item) => (
                                <button
                                    key={item.label} // Key needs to be unique, type might be same for different variations
                                    onClick={() => handleFieldClick(item.type, (item as any).options)}
                                    disabled={addingType !== null}
                                    className={`group flex items-center gap-4 p-3 w-full text-left rounded-lg hover:bg-white/10 transition-all border border-transparent hover:border-white/5 ${addingType === item.type ? 'bg-white/10 border-primary/20' : ''} ${addingType !== null && addingType !== item.type ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className={`p-2.5 rounded-md bg-white/5 text-gray-400 group-hover:text-white group-hover:bg-primary/20 transition-colors ${addingType === item.type ? 'text-primary' : ''}`}>
                                        {addingType === item.type ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <item.icon className="h-5 w-5" />
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                                            {item.label}
                                        </div>
                                        <div className="text-xs text-gray-500 group-hover:text-gray-400 transition-colors mt-0.5">
                                            {item.description}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
