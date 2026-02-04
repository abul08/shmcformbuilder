# FormBuilder UI Components & Theme Guide

## 🎨 Design System

The app uses a **dark Tailwind UI theme** inspired by enterprise-grade form builders like Typeform and modern developer tools. The design emphasizes clarity, professionalism, and accessibility.

### Color Palette

```css
/* Base Colors */
Background: bg-gray-900 (Dark slate)
Foreground: text-white

/* Interactive Elements */
Primary: bg-primary (Blue - #3b82f6)
Input Fields: bg-white/5 with outline-white/10
Borders: border-white/10

/* Status Colors */
Success: bg-green-500/10, text-green-400
Error: bg-red-500/10, text-red-400
Warning: bg-yellow-500/10, text-yellow-400
Info: bg-blue-500/10, text-blue-400
```

### Typography

- **Headings**: Font-bold to font-black, tracking-tight
- **Body**: text-gray-400 for secondary text
- **Labels**: text-white, text-sm/6, font-medium
- **Uppercase Labels**: text-xs, font-semibold, tracking-wider

## 📦 UI Components

### 1. **Button** (`src/components/ui/button.tsx`)

Variants using `class-variance-authority`:
- `default`: Primary button with bg-primary
- `destructive`: Red variant for delete actions
- `outline`: Border with transparent background
- `secondary`: Subtle gray background
- `ghost`: No background, hover effect only
- `link`: Text link style

Sizes: `sm`, `default`, `lg`, `icon`

### 2. **Input** (`src/components/ui/input.tsx`)

Dark theme input with:
- `bg-white/5` background
- `outline-white/10` border
- `focus:outline-primary` focus state
- Support for icons (using absolute positioning)

### 3. **Card** (`src/components/ui/card.tsx`)

Card components with dark theme:
- `bg-white/5` background
- `ring-1 ring-white/10` border
- Hover states with `ring-white/20`

Parts: `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`

### 4. **Label** (`src/components/ui/label.tsx`)

Uses `@radix-ui/react-label` with dark styling

### 5. **Dialog/Modal** (`src/components/ui/dialog.tsx`)

Full-screen modal with:
- `bg-gray-900/80 backdrop-blur-sm` backdrop
- `bg-gray-800` dialog background
- `ring-1 ring-white/10` border
- Smooth animations (zoom-in-95, slide-in-from-bottom-4)

Parts: `Dialog`, `DialogHeader`, `DialogTitle`, `DialogDescription`, `DialogContent`, `DialogFooter`

### 6. **Confirm Dialog** (`src/components/ui/confirm-dialog.tsx`)

Specialized confirmation dialog with:
- Icon support (AlertTriangle, CheckCircle, etc.)
- Variants: `danger`, `warning`, `info`
- Promise-based API via `useConfirmDialog()` hook

Usage:
```tsx
const { confirm, dialog } = useConfirmDialog()

const handleDelete = async () => {
  const confirmed = await confirm({
    title: 'Delete item?',
    description: 'This action cannot be undone.',
    confirmText: 'Delete',
    variant: 'danger'
  })
  if (confirmed) {
    // perform delete
  }
}

return <>{/* your UI */}{dialog}</>
```

### 7. **Toast Notifications** (`src/components/ui/toast.tsx`)

Context-based toast system with:
- Auto-dismiss after 5 seconds
- Types: `success`, `error`, `warning`, `info`
- Positioned fixed bottom-right
- Slide-in animation

Usage:
```tsx
// In layout or app root
<ToastProvider>
  {children}
</ToastProvider>

// In any component
const { addToast } = useToast()
addToast('Form saved successfully!', 'success')
```

### 8. **Badge** (`src/components/ui/badge.tsx`)

Status badge component with:
- Variants: `default`, `success`, `warning`, `error`, `info`, `secondary`
- Small rounded-full design
- Ring-1 ring-inset for subtle borders

### 9. **Skeleton** (`src/components/ui/skeleton.tsx`)

Loading skeleton with:
- `animate-pulse` animation
- `bg-white/5` background
- Pre-built patterns: `FormCardSkeleton`, `TableRowSkeleton`, `FieldSkeleton`

## 🎯 Page Styles

### Landing Page (`/`)
- Dark hero with gradient overlay
- Animated badge with pulsing dot
- Feature cards with hover effects
- CTA section with rounded-3xl cards

### Login/Signup (`/login`)
- Centered card layout
- Icon-enhanced input fields
- Social login buttons
- Auto-complete attributes

### Dashboard (`/dashboard`)
- Sticky navigation with backdrop-blur
- Grid layout for form cards
- Search and filter bar
- Mobile FAB for quick actions

### Form Builder (`/forms/[id]/edit`)
- Section-based layout with `border-b border-white/10`
- Grid system: `sm:grid-cols-6` for responsive fields
- Drag-and-drop with visual feedback
- Inline field type selector
- Auto-save indicator

### Public Form (`/f/[slug]`)
- Clean, distraction-free design
- Radio buttons with `before:` pseudo-element styling
- Checkboxes with SVG checkmark overlay
- Success screen with confetti-ready layout

### Responses Page (`/forms/[id]/responses`)
- Data table with hover states
- Export to CSV functionality
- Empty state with icon
- Pagination footer

## 🛠️ Tailwind Utilities

### Custom Classes
```css
.no-scrollbar          /* Hide scrollbar */
.custom-scrollbar      /* Dark themed scrollbar */
.animate-shake         /* Shake animation for errors */
```

### Common Patterns

**Input Field:**
```tsx
<input className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-primary sm:text-sm/6" />
```

**Button:**
```tsx
<button className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors" />
```

**Card:**
```tsx
<div className="rounded-lg bg-white/5 ring-1 ring-white/10 p-6" />
```

**Section Divider:**
```tsx
<div className="border-b border-white/10 pb-12" />
```

## 🎭 Animations

All animations use Tailwind's built-in animation utilities:
- `animate-in`: Entry animations
- `fade-in`: Fade effect
- `zoom-in-95`: Zoom from 95%
- `slide-in-from-*`: Slide from direction
- `duration-*`: Animation duration
- `animate-pulse`: Loading state
- `animate-spin`: Loading spinner

## 📱 Responsive Design

Mobile-first approach with breakpoints:
- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px
- `xl:` - 1280px

All forms and tables are fully responsive with touch-friendly interactions.

## 🔧 Configuration Files

### `tailwind.config.js`
- Extends theme with HSL color variables
- Custom border radius using CSS variables
- Container configuration
- `tailwindcss-animate` plugin

### `postcss.config.js`
- Tailwind CSS v3
- Autoprefixer

### `globals.css`
- Tailwind directives
- CSS variables for theming
- Custom utilities
- Base styles

## 🚀 Performance

- All animations use CSS transforms (GPU-accelerated)
- Backdrop-blur for glassmorphism effects
- Lazy-loaded icons from lucide-react
- Optimized re-renders with React.memo where needed

## 📚 Dependencies

```json
{
  "tailwindcss": "^3.4.19",
  "tailwindcss-animate": "^1.0.7",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.4.0",
  "lucide-react": "^0.563.0",
  "@radix-ui/react-label": "^2.1.8",
  "@radix-ui/react-slot": "^1.2.4"
}
```

## 🎨 Best Practices

1. **Always use semantic HTML** (button, input, label, etc.)
2. **Consistent spacing** (use multiples of 4: 4, 8, 12, 16, 24)
3. **Ring instead of border** for dark theme (ring-1 ring-white/10)
4. **Opacity for variants** (bg-white/5, bg-white/10, bg-white/20)
5. **Transition-colors** for smooth hover effects
6. **Focus states** with outline-primary for accessibility
7. **Loading states** with disabled:opacity-50 and cursor-not-allowed
