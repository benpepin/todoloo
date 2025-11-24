# Checklist Bug Fixes & Implementation Plan

## Current Issues Identified

Based on user report, the checklist functionality has several critical bugs:

1. **Double Item Creation**: Creating a checklist adds 2 items instead of 1
2. **Inconsistent Behavior**: Different behavior between creating new task vs editing existing task
3. **Save Issues**: Changes/adjustments not being saved properly
4. **General UX Confusion**: Experience is not consistent and predictable

---

## Root Cause Analysis

After reviewing the code, here are the likely causes:

### Issue 1: Double Item Creation
**Location**: `UnifiedChecklistSection.tsx` lines 322-329 + parent components

**Problem**:
- Auto-creates first empty item when `isEditing && items.length === 0` (line 324)
- Parent component (ToDoCard) might also be creating initial item
- Race condition between parent and child creating items

**Evidence**:
```typescript
// In UnifiedChecklistSection (line 324-328)
if (isEditing && items.length === 0 && !hasCreatedInitialItem) {
  setHasCreatedInitialItem(true)
  setNeedsInitialFocus(true)
  onAddItem('') // CREATES ITEM 1
}
```

If parent also calls `onAddItem('')` when user clicks "Add Checklist", you get 2 items.

### Issue 2: Inconsistent Create vs Edit Behavior
**Location**: `ToDoCard.tsx` vs `SortableTaskItem.tsx`

**Problem**:
- Different prop values passed to `UnifiedChecklistSection`
- Create mode: Uses temporary local state (`tempChecklistItems`)
- Edit mode: Uses persisted database items (`task.checklistItems`)
- Different save flows for temp vs persisted items

**Evidence**:
```typescript
// In ToDoCard (Create mode) - line 462-479
<UnifiedChecklistSection
  items={tempChecklistItems}  // LOCAL STATE
  onAddItem={handleAddTempChecklistItem}  // LOCAL HANDLER
  // ... temp handlers
/>

// In SortableTaskItem (Edit mode) - line 428-438
<UnifiedChecklistSection
  items={task.checklistItems || []}  // DATABASE STATE
  onAddItem={(description) => useToDoStore.getState().addChecklistItem(task.id, description)}  // DB HANDLER
  // ... database handlers
/>
```

### Issue 3: Save Issues
**Location**: Multiple places

**Problems**:
- `saveAllItems()` method (line 281-313) tries to save, but parent might not wait for it
- ToDoCard form submission doesn't properly wait for checklist ref save
- Race conditions between blur save and form submit save
- `editValue` not syncing properly with `item.description` when editing

**Evidence**:
```typescript
// ToDoCard line 140-143 - Uses checklistRef but might not wait properly
let checklistItemsToAdd = [...tempChecklistItems]
if (checklistRef.current) {
  checklistItemsToAdd = await checklistRef.current.saveAllItems()
}
```

---

## Phased Implementation Plan

### Phase 0: Debugging & Validation (Day 1)
**Goal**: Understand exact bug reproduction steps and validate root causes

#### Tasks:
- [ ] Add comprehensive logging to track item creation
- [ ] Add logging to track save operations
- [ ] Test create flow step-by-step with logs
- [ ] Test edit flow step-by-step with logs
- [ ] Document exact reproduction steps for each bug
- [ ] Validate root cause analysis with logs

#### Success Criteria:
- Can reliably reproduce each bug
- Logs show exactly where double creation happens
- Logs show exactly where saves fail
- Clear understanding of data flow

---

### Phase 1: Fix Critical Bugs (Days 2-3)
**Goal**: Fix the immediate broken functionality to make checklists usable

#### Fix 1.1: Prevent Double Item Creation
**File**: `UnifiedChecklistSection.tsx`

**Changes**:
1. Remove auto-creation of first item from `UnifiedChecklistSection`
2. Make parent components responsible for creating first item
3. Add prop to control whether to show empty state or create first item

```typescript
// NEW PROP
interface UnifiedChecklistSectionProps {
  // ... existing props
  /** If true, automatically create first empty item when empty */
  autoCreateFirstItem?: boolean
}

// UPDATED LOGIC (line 322-329)
useEffect(() => {
  // ONLY create if explicitly told to via prop
  if (autoCreateFirstItem && isEditing && items.length === 0 && !hasCreatedInitialItem) {
    setHasCreatedInitialItem(true)
    setNeedsInitialFocus(true)
    onAddItem('')
  }
}, [autoCreateFirstItem, isEditing, items.length, hasCreatedInitialItem, onAddItem])
```

**Parent Component Changes**:
```typescript
// ToDoCard: Explicitly create first item when user clicks "Add Checklist"
const handleAddChecklist = () => {
  setShowChecklist(true)
  // Create first empty item immediately
  if (tempChecklistItems.length === 0) {
    handleAddTempChecklistItem('')
  }
}

// SortableTaskItem: Same approach
const handleAddChecklist = async () => {
  if (!task.checklistItems || task.checklistItems.length === 0) {
    await loadChecklistItems(task.id)
    // Create first item if still empty
    if (!task.checklistItems || task.checklistItems.length === 0) {
      await useToDoStore.getState().addChecklistItem(task.id, '')
    }
  }
  setShowChecklist(true)
}
```

#### Fix 1.2: Unify Create and Edit Behavior
**Files**: `ToDoCard.tsx`, `SortableTaskItem.tsx`, `UnifiedChecklistSection.tsx`

**Strategy**: Make both modes use the same data flow pattern

**Option A: Database-First (Recommended)**
Create temporary task in database immediately, save checklist items to database:

```typescript
// ToDoCard: Create task in database immediately when user starts creating
const [draftTaskId, setDraftTaskId] = useState<string | null>(null)

// When user opens create card
useEffect(() => {
  const createDraftTask = async () => {
    const draft = await addTask('', 30, undefined, false, { isDraft: true })
    setDraftTaskId(draft.id)
  }
  createDraftTask()
}, [])

// Now checklist items can be saved directly to database
<UnifiedChecklistSection
  items={draftTask?.checklistItems || []}
  onAddItem={(description) => addChecklistItem(draftTaskId!, description)}
  // ... use same handlers as edit mode
/>

// On form submit: Update draft task with description and mark as not draft
// On cancel: Delete draft task and all its checklist items
```

**Option B: Normalize Local State (Alternative)**
Keep temp state but use same structure as database:

```typescript
// Use same ChecklistItem interface for temp items
// Use same handler signatures
// Just point to different storage (local vs db)
```

#### Fix 1.3: Fix Save Logic
**File**: `UnifiedChecklistSection.tsx`, `ToDoCard.tsx`

**Changes**:

1. Fix blur vs submit race condition:
```typescript
// In SortableChecklistItem
const isSubmittingRef = useRef(false)  // ALREADY EXISTS (line 63)

onBlur={() => {
  // ONLY save on blur if not submitting via Enter
  if (!isSubmittingRef.current) {
    handleSave()
  }
}}
```

2. Ensure form waits for checklist save:
```typescript
// In ToDoCard handleSubmit (line 137-299)
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()

  // CRITICAL: Wait for checklist save BEFORE proceeding
  let checklistItemsToAdd = [...tempChecklistItems]
  if (checklistRef.current) {
    console.log('Waiting for saveAllItems...')
    checklistItemsToAdd = await checklistRef.current.saveAllItems()
    console.log('saveAllItems completed:', checklistItemsToAdd)
  }

  // NOW proceed with task creation
  if (description.trim()) {
    // ... rest of logic
  }
}
```

3. Fix editValue sync issue:
```typescript
// In SortableChecklistItem (line 88-93)
// CURRENT CODE IS CORRECT - only sync when not editing
useEffect(() => {
  if (!isEditing) {
    setEditValue(item.description)
  }
}, [item.description, isEditing])

// But add validation:
useEffect(() => {
  console.log('Item description changed:', item.description, 'editValue:', editValue, 'isEditing:', isEditing)
}, [item.description, editValue, isEditing])
```

#### Testing Checklist for Phase 1:
- [ ] Creating new task with checklist creates exactly 1 item
- [ ] Editing existing task with checklist loads items correctly
- [ ] Adding items in create mode works consistently
- [ ] Adding items in edit mode works consistently
- [ ] Saving changes in create mode persists all items
- [ ] Saving changes in edit mode persists all items
- [ ] No duplicate items created
- [ ] No items lost on save

---

### Phase 2: UX Consistency & Polish (Days 4-5)
**Goal**: Make the experience predictable and match industry standards

#### Enhancement 2.1: Unified Keyboard Shortcuts
**File**: `UnifiedChecklistSection.tsx`

Add missing keyboard shortcuts:

```typescript
// In handleKeyDown (line 124-159)
const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, onAddNext?: () => void) => {
  e.stopPropagation()

  if (e.key === 'Enter') {
    // Existing logic...
  }
  else if (e.key === 'Escape') {
    // Existing logic...
  }
  // NEW: Cmd/Ctrl + Enter to toggle completion
  else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    onToggle(item.id)
    // Stay in editing mode, just toggle checkbox
  }
  // NEW: Shift + Enter for line break (currently creates new item)
  else if (e.shiftKey && e.key === 'Enter') {
    e.preventDefault()
    // Allow default behavior (line break) in input
    // Convert input to textarea for this case
  }
  else if ((e.key === 'Delete' || e.key === 'Backspace') && onDeleteAndFocusPrevious) {
    // Existing logic...
  }
}
```

#### Enhancement 2.2: Better Visual Feedback
**File**: `UnifiedChecklistSection.tsx`

Add transitions and animations:

```typescript
// Add framer-motion for smooth list animations
import { motion, AnimatePresence } from 'framer-motion'

// Wrap items in AnimatePresence
<AnimatePresence mode="popLayout">
  {items.map((item, index) => (
    <motion.div
      key={item.id}
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
    >
      <SortableChecklistItem
        // ... props
      />
    </motion.div>
  ))}
</AnimatePresence>
```

Add hover state enhancements:

```css
/* In checklist item styles */
.checklist-item:hover {
  background-color: var(--color-todoloo-muted);
  transform: translateX(2px); /* Subtle slide on hover */
  transition: all 0.15s ease;
}

.checklist-checkbox:hover {
  transform: scale(1.1);
  border-color: var(--color-todoloo-gradient-start);
}
```

#### Enhancement 2.3: Empty State
**File**: `UnifiedChecklistSection.tsx`

Add helpful empty state:

```typescript
// After containerClasses definition (line 424)
if (items.length === 0 && !isEditing) {
  return (
    <div className={containerClasses}>
      <div className="py-8 text-center">
        <ListChecks
          className="w-12 h-12 mx-auto mb-3 opacity-20"
          style={{ color: 'var(--color-todoloo-text-muted)' }}
        />
        <p className="text-sm" style={{ color: 'var(--color-todoloo-text-muted)' }}>
          Break down this task into smaller steps
        </p>
        <button
          onClick={() => {
            onAddItem('')
            // Focus will be handled by effect
          }}
          className="mt-3 px-4 py-2 text-sm rounded-lg transition-colors"
          style={{
            backgroundColor: 'var(--color-todoloo-muted)',
            color: 'var(--color-todoloo-text-secondary)'
          }}
        >
          Add First Item
        </button>
      </div>
    </div>
  )
}
```

#### Enhancement 2.4: Loading and Error States
**Files**: `UnifiedChecklistSection.tsx`, parent components

Add loading state:

```typescript
// NEW PROP
interface UnifiedChecklistSectionProps {
  // ... existing props
  isLoading?: boolean
  error?: string | null
}

// RENDER LOADING STATE
if (isLoading) {
  return (
    <div className={containerClasses}>
      <div className="py-4 flex items-center justify-center gap-2">
        <Loader className="w-4 h-4 animate-spin" />
        <span className="text-sm" style={{ color: 'var(--color-todoloo-text-muted)' }}>
          Loading checklist...
        </span>
      </div>
    </div>
  )
}

// RENDER ERROR STATE
if (error) {
  return (
    <div className={containerClasses}>
      <div className="py-4 px-4 rounded-lg bg-red-50 border border-red-200">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    </div>
  )
}
```

#### Testing Checklist for Phase 2:
- [ ] Cmd/Ctrl+Enter toggles checkbox while editing
- [ ] Visual feedback on all hover states
- [ ] Smooth animations when adding/removing items
- [ ] Empty state shows helpful message
- [ ] Loading state displays during async operations
- [ ] Error states display user-friendly messages
- [ ] Keyboard shortcuts feel natural and responsive

---

### Phase 3: Advanced Features & Optimization (Days 6-7)
**Goal**: Add power-user features and optimize performance

#### Enhancement 3.1: Command Palette
**New File**: `src/components/ChecklistCommandPalette.tsx`

Quick actions menu (Cmd+K):

```typescript
export default function ChecklistCommandPalette() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <Command>
          <CommandInput placeholder="Type a command..." />
          <CommandList>
            <CommandGroup heading="Checklist Actions">
              <CommandItem onSelect={() => {/* Add item */}}>
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </CommandItem>
              <CommandItem onSelect={() => {/* Check all */}}>
                <CheckCheck className="mr-2 h-4 w-4" />
                Check All
              </CommandItem>
              <CommandItem onSelect={() => {/* Uncheck all */}}>
                <X className="mr-2 h-4 w-4" />
                Uncheck All
              </CommandItem>
              <CommandItem onSelect={() => {/* Delete completed */}}>
                <Trash className="mr-2 h-4 w-4" />
                Delete Completed
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
```

#### Enhancement 3.2: Bulk Operations
**File**: `UnifiedChecklistSection.tsx`

Add bulk action methods:

```typescript
// Expose bulk operations via ref
useImperativeHandle(ref, () => ({
  saveAllItems: async () => { /* existing */ },

  // NEW BULK OPERATIONS
  checkAll: async () => {
    const promises = items
      .filter(item => !item.isCompleted)
      .map(item => onToggleItem(item.id))
    await Promise.all(promises)
  },

  uncheckAll: async () => {
    const promises = items
      .filter(item => item.isCompleted)
      .map(item => onToggleItem(item.id))
    await Promise.all(promises)
  },

  deleteCompleted: async () => {
    const promises = items
      .filter(item => item.isCompleted)
      .map(item => onDeleteItem(item.id))
    await Promise.all(promises)
  },

  getProgress: () => {
    const completed = items.filter(item => item.isCompleted).length
    const total = items.length
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 }
  }
}), [items, onToggleItem, onDeleteItem])
```

#### Enhancement 3.3: Performance Optimization
**File**: `UnifiedChecklistSection.tsx`

Memoize expensive operations:

```typescript
import { useMemo, useCallback } from 'react'

// Memoize sortable item IDs
const sortableIds = useMemo(
  () => items.map(item => item.id),
  [items]
)

// Memoize handlers to prevent re-renders
const handleToggleMemo = useCallback(
  (itemId: string) => handleToggle(itemId),
  [handleToggle]
)

const handleUpdateMemo = useCallback(
  (itemId: string, description: string) => handleUpdate(itemId, description),
  [handleUpdate]
)

// Use React.memo for SortableChecklistItem
const SortableChecklistItem = React.memo(function SortableChecklistItem({
  // ... props
}: SortableChecklistItemProps) {
  // ... implementation
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.description === nextProps.item.description &&
    prevProps.item.isCompleted === nextProps.item.isCompleted &&
    prevProps.shouldStartEditing === nextProps.shouldStartEditing
  )
})
```

#### Enhancement 3.4: Mobile Optimization
**File**: `UnifiedChecklistSection.tsx`

Mobile-specific improvements:

```typescript
// Detect mobile
const [isMobile, setIsMobile] = useState(false)

useEffect(() => {
  const checkMobile = () => {
    setIsMobile(window.innerWidth < 768)
  }
  checkMobile()
  window.addEventListener('resize', checkMobile)
  return () => window.removeEventListener('resize', checkMobile)
}, [])

// Adjust touch targets for mobile
const checkboxSize = isMobile ? 'w-8 h-8' : 'w-5 h-5'
const dragHandleSize = isMobile ? 'w-6 h-6' : 'w-3.5 h-3.5'

// Always show drag handle on mobile (not just hover)
const dragHandleClasses = isMobile
  ? "cursor-grab active:cursor-grabbing p-2"
  : "opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1"

// Add touch feedback
const handleTouchStart = () => {
  if ('vibrate' in navigator) {
    navigator.vibrate(10) // Haptic feedback
  }
}
```

#### Testing Checklist for Phase 3:
- [ ] Command palette opens with Cmd+K
- [ ] Check all / uncheck all works
- [ ] Delete completed items works
- [ ] No performance lag with 50+ checklist items
- [ ] Smooth scrolling on long lists
- [ ] Mobile touch targets are easy to hit (44x44px minimum)
- [ ] Drag and drop works well on mobile
- [ ] Haptic feedback on mobile (where supported)

---

### Phase 4: Documentation & Testing (Day 8)
**Goal**: Comprehensive testing and documentation

#### Task 4.1: Write Tests
**New File**: `src/components/shared/__tests__/UnifiedChecklistSection.test.tsx`

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import UnifiedChecklistSection from '../UnifiedChecklistSection'

describe('UnifiedChecklistSection', () => {
  const mockItems = [
    { id: '1', description: 'Item 1', isCompleted: false, order: 0 },
    { id: '2', description: 'Item 2', isCompleted: true, order: 1 },
  ]

  it('renders checklist items', () => {
    render(<UnifiedChecklistSection items={mockItems} {...mockHandlers} />)
    expect(screen.getByText('Item 1')).toBeInTheDocument()
    expect(screen.getByText('Item 2')).toBeInTheDocument()
  })

  it('creates new item on Enter', async () => {
    const onAddItem = jest.fn()
    render(<UnifiedChecklistSection items={[]} onAddItem={onAddItem} {...} />)

    const input = screen.getByPlaceholderText('Add todo')
    await userEvent.type(input, 'New item{Enter}')

    expect(onAddItem).toHaveBeenCalledWith('New item')
  })

  it('does not create empty items', async () => {
    const onAddItem = jest.fn()
    render(<UnifiedChecklistSection items={mockItems} onAddItem={onAddItem} {...} />)

    const input = screen.getByPlaceholderText('Add todo')
    await userEvent.type(input, '{Enter}')

    expect(onAddItem).not.toHaveBeenCalled()
  })

  it('deletes item on backspace when empty', async () => {
    const onDeleteItem = jest.fn()
    render(<UnifiedChecklistSection items={mockItems} onDeleteItem={onDeleteItem} {...} />)

    // Click to edit first item
    fireEvent.click(screen.getByText('Item 1'))

    // Clear and press backspace
    const input = screen.getByDisplayValue('Item 1')
    await userEvent.clear(input)
    await userEvent.type(input, '{Backspace}')

    expect(onDeleteItem).toHaveBeenCalledWith('1')
  })

  it('toggles checkbox without entering edit mode', async () => {
    const onToggleItem = jest.fn()
    render(<UnifiedChecklistSection items={mockItems} onToggleItem={onToggleItem} {...} />)

    const checkbox = screen.getAllByRole('button')[0]
    fireEvent.click(checkbox)

    expect(onToggleItem).toHaveBeenCalledWith('1')
  })

  it('saves on blur', async () => {
    const onUpdateItem = jest.fn()
    render(<UnifiedChecklistSection items={mockItems} onUpdateItem={onUpdateItem} {...} />)

    // Click to edit
    fireEvent.click(screen.getByText('Item 1'))

    // Type new text
    const input = screen.getByDisplayValue('Item 1')
    await userEvent.clear(input)
    await userEvent.type(input, 'Updated item')

    // Click outside to blur
    fireEvent.blur(input)

    await waitFor(() => {
      expect(onUpdateItem).toHaveBeenCalledWith('1', 'Updated item')
    })
  })

  // ... more tests
})
```

#### Task 4.2: Integration Tests
**New File**: `src/components/__tests__/ChecklistIntegration.test.tsx`

Test full create and edit flows:

```typescript
describe('Checklist Integration', () => {
  it('creates task with checklist items', async () => {
    // Test full flow from ToDoCard
  })

  it('edits existing task checklist', async () => {
    // Test full flow from SortableTaskItem
  })

  it('saves all changes on form submit', async () => {
    // Test that all checklist changes persist
  })

  // ... more integration tests
})
```

#### Task 4.3: Manual Test Plan
**New File**: `CHECKLIST_MANUAL_TEST_PLAN.md`

Comprehensive checklist for QA:

```markdown
## Create New Task with Checklist

- [ ] Open create task card
- [ ] Click "Add Checklist" - verify only 1 empty item created
- [ ] Type description and press Enter - verify new item created
- [ ] Type description and click Save - verify items saved
- [ ] Verify all items appear in created task

## Edit Existing Task Checklist

- [ ] Click existing task to edit
- [ ] Click "Add Checklist" if no checklist
- [ ] Add items - verify each item saved
- [ ] Edit items - verify changes saved
- [ ] Delete items - verify removed
- [ ] Reorder items - verify order saved

## Keyboard Shortcuts

- [ ] Enter creates new item
- [ ] Escape cancels edit
- [ ] Backspace on empty deletes
- [ ] Cmd+Enter toggles checkbox
- [ ] All shortcuts work consistently

## Edge Cases

- [ ] Create and immediately cancel - no orphaned items
- [ ] Edit and click outside - changes saved
- [ ] Rapid Enter presses - no duplicates
- [ ] Long descriptions - text wraps properly
- [ ] 50+ items - performance good
- [ ] Network offline - queues saves

## Mobile Testing

- [ ] Touch targets easy to hit
- [ ] Drag and drop works
- [ ] Keyboard appears correctly
- [ ] No text selection issues
```

#### Task 4.4: User Documentation
**New File**: `docs/CHECKLIST_USAGE.md`

End-user guide:

```markdown
# Using Checklists in TODOLOOS

## Adding a Checklist to a Task

1. When creating or editing a task, click the "•••" menu
2. Select "Add Checklist"
3. An empty checklist item will appear
4. Type your first item and press Enter to add more

## Keyboard Shortcuts

- **Enter**: Create new checklist item
- **Cmd/Ctrl + Enter**: Toggle item completion
- **Backspace** on empty item: Delete item
- **Escape**: Cancel editing
- **Drag icon**: Reorder items

## Tips

- Click any item to edit it inline
- Changes save automatically when you click outside
- Delete the first item to remove the entire checklist
- Use checklists to break down complex tasks
```

---

## Success Metrics

### Phase 1 Success:
- ✅ Zero reports of duplicate items
- ✅ 100% save reliability (all items saved)
- ✅ Create and edit behavior identical

### Phase 2 Success:
- ✅ User testing shows intuitive UX
- ✅ Keyboard shortcuts feel natural
- ✅ Visual feedback is clear
- ✅ Empty states are helpful

### Phase 3 Success:
- ✅ No lag with 50+ items
- ✅ Mobile usability score > 90
- ✅ Power users adopt bulk actions
- ✅ Command palette usage > 20%

### Phase 4 Success:
- ✅ Test coverage > 80%
- ✅ Zero critical bugs in production
- ✅ User documentation complete
- ✅ Support tickets decrease

---

## Risk Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation**:
- Write comprehensive tests before making changes
- Use feature flags to gradually roll out changes
- Keep old code commented for quick rollback
- Test on staging environment first

### Risk 2: Data Loss During Migration
**Mitigation**:
- Backup database before Phase 1 changes
- Add migration script to handle existing checklists
- Test migration on copy of production data
- Have rollback plan ready

### Risk 3: Performance Regression
**Mitigation**:
- Profile performance before and after changes
- Use React DevTools Profiler to catch re-renders
- Load test with 100+ checklist items
- Implement virtual scrolling if needed

### Risk 4: Mobile Experience Degradation
**Mitigation**:
- Test on real devices (iOS and Android)
- Use BrowserStack for cross-device testing
- Get user feedback early
- A/B test mobile changes

---

## Timeline Estimate

- **Phase 0**: 1 day (debugging & validation)
- **Phase 1**: 2 days (critical bug fixes)
- **Phase 2**: 2 days (UX consistency)
- **Phase 3**: 2 days (advanced features)
- **Phase 4**: 1 day (testing & docs)

**Total**: 8 days

**Recommended Schedule**:
- Week 1: Phases 0-2 (get to working state)
- Week 2: Phases 3-4 (polish & test)

---

## Next Steps

1. **Approve this plan** - Review and sign off
2. **Set up feature branch** - `git checkout -b fix/checklist-overhaul`
3. **Start Phase 0** - Add logging and reproduce bugs
4. **Daily standups** - Review progress and blockers
5. **Demo after Phase 1** - Show working fixes
6. **QA after Phase 2** - Get user feedback
7. **Final review** - Before merging to main

---

## Questions to Answer Before Starting

1. **Storage Strategy**: Should we use database-first (Option A) or keep temp state (Option B)?
   - Recommendation: Database-first for consistency

2. **Breaking Changes**: Is it okay to change the API of `UnifiedChecklistSection`?
   - Likely yes, since it's internal component

3. **Migration**: Do we need to migrate existing checklist data?
   - Probably no if we're just fixing bugs, not changing schema

4. **Priority**: Which phase should we focus on first if time is limited?
   - Must do: Phase 0 + Phase 1
   - Should do: Phase 2
   - Nice to have: Phase 3 + Phase 4

5. **User Testing**: When can we get real users to test?
   - After Phase 1: Internal testing
   - After Phase 2: Beta user testing
   - After Phase 3: Public release
