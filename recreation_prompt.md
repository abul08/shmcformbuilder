# Form Builder Replication Prompt

I need you to build a sophisticated, mobile-friendly Form Builder application using **Next.js 16 (App Router)**, **Supabase**, and **Tailwind CSS**.

The application must support two distinct form creation modes: **English** and **Dhivehi** (Maldivian Language, RTL).

## 1. Core Tech Stack
- **Framework**: Next.js 15+ (App Directory)
- **Database**: Supabase (PostgreSQL) + Row Level Security (RLS)
- **Styling**: Tailwind CSS (Dark Mode default)
- **UI Components**: Radix UI primitives (Dialog, Switch, etc.) + Lucide React Icons
- **Drag & Drop**: @dnd-kit (Core, Sortable, Utilities)
- **Fonts**:
  - English: `Inter` (Variable)
  - Dhivehi Headings: `Waheed` (Custom Font)
  - Dhivehi Body: `Faruma` (Custom Font)

## 2. Database Schema (Supabase)

Please implement the following schema exactly. Use UUIDs for IDs and enable RLS.

### Tables
1.  **`forms`**:
    -   `id` (uuid, pk), `user_id` (fk auth), `title`, `description`
    -   `is_published`, `is_accepting_responses` (defaults to true)
    -   `closes_at` (timestamptz)
    -   `slug` (unique text), `settings` (jsonb - stores language preference 'en'/'dv')
2.  **`form_fields`**:
    -   `id` (uuid, pk), `form_id` (fk)
    -   `type` (text enum check: `short_text`, `long_text`, `email`, `number`, `checkbox`, `radio`, `dropdown`, `date`, `time`, `file`, `image`, `text_block`, `consent`, `dhivehi_text`, `english_text`)
    -   `label`, `placeholder`, `required`, `options` (jsonb), `order_index`
3.  **`form_responses`**:
    -   `id`, `form_id`, `submitted_at`, `metadata` (jsonb)
4.  **`form_answers`**:
    -   `id`, `response_id`, `field_id`, `value` (jsonb)

### RLS Policies
-   **Forms/Fields**: Users can CRUD their own forms. Public can SELECT published forms.
-   **Responses**: Public can INSERT if form is published. Users can SELECT responses to their forms.

## 3. Key Features & Components

### A. Dashboard (`/dashboard`)
-   List user's forms with response counts.
-   "Create Form" button opens a dialog to select language: **English** or **Dhivehi**.
-   Redirects to `/forms/[id]/edit` upon creation.

### B. Form Builders (Separated Logic)
You must implement two separate builder components to handle the distinct UX needs.

1.  **`EnglishFormBuilder.tsx`**:
    -   Standard LTR layout.
    -   **Toolbox**: Sticky sidebar on Desktop, **Floating Action Button (FAB)** + Modal on Mobile.
    -   **Fields**: Supports all types. Includes special `dhivehi_text` field (RTL input in English form).
    -   **Transliteration**: When typing in `dhivehi_text` configuration, auto-convert Latin to Thaana using the mapping below.

2.  **`DhivehiFormBuilder.tsx`**:
    -   **Full RTL Layout** (`dir="rtl"`).
    -   **Fonts**: Use `font-waheed` for headings, `font-faruma` for body.
    -   **UI Text**: All interface elements (buttons, labels, toasts) must be in Dhivehi.
    -   **Toolbox**: Specialized Dhivehi labels. Includes `english_text` field (LTR input in Dhivehi form).
    -   **Transliteration**: Enforced on Form Title, Description, and Field Labels. Typing "k" -> "ކ".

### C. Public Form Views (`/f/[slug]`)
-   **`EnglishPublicForm.tsx`**:
    -   Modern, centered layout.
    -   **Date/Time Pickers**: Use `[color-scheme:dark]` for native dark mode pickers.
    -   **Validation**: HTML5 + Custom Toast notifications.
-   **`DhivehiPublicForm.tsx`**:
    -   RTL Layout.
    -   **Styling**: Right-aligned text, Dhivehi fonts.
    -   **Consent Field**: styled as a distinct block with "Accept" toggle.

### D. Shared Utilities
-   **`thaana.ts`**:
    ```typescript
    export const latinToThaanaMap: Record<string, string> = {
        'a': 'ަ', 'b': 'ބ', 'c': 'ޗ', 'd': 'ދ', 'e': 'ެ', 'f': 'ފ', 'g': 'ގ',
        'h': 'ހ', 'i': 'ި', 'j': 'ޖ', 'k': 'ކ', 'l': 'ލ', 'm': 'މ', 'n': 'ނ',
        'o': 'ޮ', 'p': 'ޕ', 'q': 'ް', 'r': 'ރ', 's': 'ސ', 't': 'ތ', 'u': 'ު',
        'v': 'ވ', 'w': 'އ', 'x': 'ޘ', 'y': 'ޔ', 'z': 'ޒ',
        'A': 'ާ', 'B': 'ޞ', 'C': 'ޝ', 'D': 'ޑ', 'E': 'ޭ', 'F': 'ﷲ', 'G': 'ޣ',
        'H': 'ޙ', 'I': 'ީ', 'J': 'ޛ', 'K': 'ޚ', 'L': 'ޛ', 'M': 'ޟ', 'N': 'ޏ',
        'O': 'ޯ', 'P': '', 'Q': 'ޤ', 'R': 'ޜ', 'S': 'ށ', 'T': 'ޓ', 'U': 'ޫ',
        'V': 'ޥ', 'W': 'ޢ', 'X': 'ޘ', 'Y': 'ޠ', 'Z': 'ޡ'
    }
    // Implement latinToThaana(text) function
    ```

## 4. Design Guidelines (Critical)
-   **Theme**: Deep Dark Mode (`bg-gray-900`, `text-white`, `border-white/10`).
-   **Inputs**: `bg-white/5`, `border-white/10`, `focus:ring-primary`.
-   **Mobile First**:
    -   Hide desktop sidebars on mobile.
    -   Use Bottom Sheet / Modal for "Add Field" on mobile.
    -   Large touch targets (44px+).
-   **Colors**:
    -   Primary: Deep Purple/Standard Tailwind Primary.
    -   Text: `text-white` (High Emphasis), `text-gray-400` (Low Emphasis).
    -   **Buttons**: `text-gray-200` for secondary actions (ghost).

## 5. Specific Behaviors
1.  **Dhivehi "Required" Toggle**: Label should read "ޖަވާބުނުދީ ދޫނުކުރެވޭނެ".
2.  **Consent Field**: Renders a text block + checkbox.
    -   English header: "Terms of Agreement".
    -   Dhivehi header: "އެއްބަސްވުން".
3.  **Unique Field Logic**:
    -   `dhivehi_text`: Label rendered in RTL Dhivehi, Input accepts Dhivehi.
    -   `english_text`: Label rendered in LTR, Input accepts English.
4.  **Closing Date**: In Form Settings, use `type="datetime-local"` with `[color-scheme:dark]`.

Please generate the project structure and key component code following these specifications.
