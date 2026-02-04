# Toast Notifications - Implementation Guide

## 🎉 Overview

Toast notifications are now integrated throughout the FormBuilder app to provide instant visual feedback when users confirm any dialogue or perform important actions.

## 🚀 What's New

### **Toast Provider**
- Added `ToastProvider` in the root layout (`src/app/layout.tsx`)
- All pages now have access to toast notifications via the `useToast()` hook
- Toasts auto-dismiss after 5 seconds
- Positioned at bottom-right of the screen
- Dark-themed to match the app's design

### **Toast Types**
```typescript
addToast(message: string, type: 'success' | 'error' | 'warning' | 'info')
```

## 📍 Where Toasts Are Shown

### **1. Dashboard - Form Management**

#### **Delete Form**
- **Trigger**: User confirms deletion in the confirm dialog
- **Success Toast**: "Form deleted successfully" (green)
- **Error Toast**: "Failed to delete form" (red)
- **Action**: Page refreshes to show updated list

#### **Duplicate Form**
- **Trigger**: User clicks duplicate button
- **Success Toast**: "Form duplicated successfully" (green)
- **Error Toast**: "Failed to duplicate form" (red)
- **Action**: Page refreshes to show new form

### **2. Form Builder - Editing Forms**

#### **Add Field**
- **Trigger**: User clicks any "Add Field" button
- **Success Toast**: "Field added successfully" (green)
- **Error Toast**: "Failed to add field" (red)
- **Visual**: New field appears immediately (optimistic update)

#### **Delete Field**
- **Trigger**: User confirms deletion in the confirm dialog
- **Success Toast**: "Question deleted successfully" (green)
- **Error Toast**: "Failed to delete question" (red)
- **Visual**: Field disappears immediately (optimistic update)

#### **Publish/Unpublish Form**
- **Trigger**: User clicks Publish or Unpublish button
- **Success Toast (Publish)**: "Form published successfully" (green)
- **Success Toast (Unpublish)**: "Form unpublished" (blue info)
- **Error Toast**: "Failed to update form status" (red)
- **Visual**: Button text changes immediately

### **3. Public Form - Submitting Responses**

#### **Submit Response**
- **Trigger**: User submits the form
- **Success Toast**: "Response submitted successfully!" (green)
- **Error Toast**: Displays specific error message (red)
- **Visual**: Shows success screen with confetti-ready layout

#### **Clear Form**
- **Trigger**: User confirms clearing in the confirm dialog
- **Toast**: "Form cleared" (blue info)
- **Visual**: All answers are cleared

### **4. Responses Page - Viewing & Exporting**

#### **Export to CSV**
- **Trigger**: User clicks "Export CSV" button
- **Success Toast**: "Exported X responses to CSV" (green)
- **Error Toast**: "Failed to export responses" (red)
- **Action**: CSV file downloads automatically

## 🎨 Toast Styling

All toasts follow the dark Tailwind UI theme:

```tsx
// Success Toast
<div className="bg-gray-800 p-4 ring-1 ring-green-500/20 shadow-lg">
  <div className="bg-green-500/10 rounded-full p-2">
    <CheckCircle className="text-green-400" />
  </div>
  <p className="text-green-400">Success message</p>
</div>

// Error Toast
<div className="bg-gray-800 p-4 ring-1 ring-red-500/20 shadow-lg">
  <div className="bg-red-500/10 rounded-full p-2">
    <AlertCircle className="text-red-400" />
  </div>
  <p className="text-red-400">Error message</p>
</div>

// Warning Toast
<div className="bg-gray-800 p-4 ring-1 ring-yellow-500/20 shadow-lg">
  <div className="bg-yellow-500/10 rounded-full p-2">
    <AlertTriangle className="text-yellow-400" />
  </div>
  <p className="text-yellow-400">Warning message</p>
</div>

// Info Toast
<div className="bg-gray-800 p-4 ring-1 ring-blue-500/20 shadow-lg">
  <div className="bg-blue-500/10 rounded-full p-2">
    <Info className="text-blue-400" />
  </div>
  <p className="text-blue-400">Info message</p>
</div>
```

## 💻 Usage Example

```tsx
import { useToast } from '@/components/ui/toast'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'

function MyComponent() {
  const { addToast } = useToast()
  const { confirm, dialog } = useConfirmDialog()

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete item?',
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    })
    
    if (confirmed) {
      try {
        await deleteItem()
        addToast('Item deleted successfully', 'success')
      } catch (error) {
        addToast('Failed to delete item', 'error')
      }
    }
  }

  return (
    <>
      <button onClick={handleDelete}>Delete</button>
      {dialog}
    </>
  )
}
```

## 🔄 Optimistic Updates

Several actions use **optimistic UI updates** for instant feedback:

1. **Delete Field**: Field disappears immediately, then toast confirms
2. **Add Field**: Field appears immediately, then toast confirms
3. **Publish Form**: Button updates immediately, then toast confirms
4. **Delete Form**: Optimistic removal (with revalidation)

## ✨ Benefits

1. **Instant Feedback**: Users immediately know their action succeeded
2. **Error Handling**: Clear error messages when things go wrong
3. **Non-Intrusive**: Toasts don't block user interaction
4. **Accessible**: Screen reader friendly with proper ARIA labels
5. **Consistent**: Same visual language across all actions
6. **Professional**: Matches modern SaaS UX patterns

## 🎯 Best Practices

1. **Keep messages short**: 3-7 words is ideal
2. **Be specific**: "Form deleted" not just "Deleted"
3. **Use proper types**: Success for confirmations, error for failures
4. **Don't overuse**: Only for important user actions
5. **Combine with modals**: Use confirm dialogs before destructive actions

## 🐛 Error Handling

All actions now have try-catch blocks:

```tsx
try {
  await performAction()
  addToast('Action successful', 'success')
  router.refresh() // Refresh data if needed
} catch (error) {
  addToast('Action failed', 'error')
  console.error(error) // Log for debugging
}
```

## 🎬 Animation

Toasts use smooth animations:
- **Enter**: `slide-in-from-right-full` with `fade-in`
- **Exit**: Fade out with transform
- **Duration**: 300ms enter, 200ms exit
- **Auto-dismiss**: 5 seconds

## 📦 Components Updated

1. ✅ `src/app/layout.tsx` - Added ToastProvider
2. ✅ `src/components/FormList.tsx` - Delete & duplicate toasts
3. ✅ `src/components/FormBuilder.tsx` - Field operations & publish toasts
4. ✅ `src/components/PublicForm.tsx` - Submit & clear toasts
5. ✅ `src/components/ResponsesTable.tsx` - Export toast

## 🔮 Future Enhancements

Potential improvements:
- Undo actions from toasts
- Action buttons in toasts (e.g., "View form")
- Toast queue management for multiple simultaneous toasts
- Custom toast durations based on importance
- Toast history/log
