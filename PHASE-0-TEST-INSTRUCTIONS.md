# Phase 0: Manual Testing Instructions

## Setup

1. **Open Dev Server**: http://localhost:3001 (currently running)
2. **Open Browser Console**: Press F12 or Cmd+Option+I
3. **Filter Console**: Type `[` in the console filter to show only our logging (all our logs start with `[ComponentName]`)

## Test 1: Create New Task with Checklist (Expected Bug: Double Item)

### Steps:
1. Open create task card (click + button or press 'n')
2. **Open console** and watch for logs
3. Type a task description: "Test task with checklist"
4. Click the "•••" (options) menu
5. Click "Add Checklist"
6. **WATCH CONSOLE** - Look for:
   - `[ToDoCard] handleAddChecklist called`
   - `[UnifiedChecklistSection] AUTO-CREATING FIRST ITEM` (if this appears)
   - `[ToDoCard] handleAddTempChecklistItem called` (if this appears)

### Expected Behavior (Current Bug):
- **Should create**: 1 empty checklist item
- **Bug**: Might create 2 empty checklist items

### Questions to Answer:
- [ ] How many `handleAddTempChecklistItem` calls do you see?
- [ ] How many times does `AUTO-CREATING FIRST ITEM` log appear?
- [ ] How many empty checklist items appear in the UI?
- [ ] What is the exact sequence of log messages?

### Log Your Findings:
```
Number of items created: ___
handleAddTempChecklistItem calls: ___
AUTO-CREATING calls: ___

Console log sequence:
1.
2.
3.
...
```

---

## Test 2: Add Checklist Items in Create Mode

### Steps:
1. Continue from Test 1 (or start fresh)
2. In the checklist item input, type: "First item"
3. Press Enter
4. **WATCH CONSOLE** for:
   - `[UnifiedChecklistSection] handleAddItemAfter called`
   - `[ToDoCard] handleAddTempChecklistItem called`
5. Type "Second item" and press Enter again

### Expected Behavior:
- Each Enter should create exactly 1 new item
- Total should be 3 items (empty + "First item" + "Second item")

### Questions to Answer:
- [ ] How many items are created after pressing Enter twice?
- [ ] Are any duplicate items created?
- [ ] What's the timestamp difference between `handleAddItemAfter` and `handleAddTempChecklistItem`?

### Log Your Findings:
```
Items after 2 Enters: ___
Any duplicates: Yes / No
Timestamps show delay: Yes / No / N/A

Console log sequence:
[Paste relevant logs here]
```

---

## Test 3: Save Task with Checklist Items

### Steps:
1. Continue from Test 2 (should have task description + checklist items)
2. **Clear console** for clarity
3. Click "Create" button
4. **WATCH CONSOLE** for:
   - `[ToDoCard] handleSubmit called`
   - `[ToDoCard] handleSubmit - calling checklistRef.saveAllItems()`
   - `[UnifiedChecklistSection] saveAllItems called`
   - `[UnifiedChecklistSection] saveAllItems - all saves completed`
   - `[ToDoCard] handleSubmit - saveAllItems returned`

### Expected Behavior:
- All checklist items should be saved
- Task should be created with all checklist items attached

### Questions to Answer:
- [ ] Did `saveAllItems` complete before task creation?
- [ ] How many items were returned from `saveAllItems`?
- [ ] Did any items get lost?
- [ ] Check the created task - how many checklist items does it have?

### Log Your Findings:
```
saveAllItems completed: Yes / No
Items returned by saveAllItems: ___
Items visible in created task: ___
Any items lost: Yes / No

Console log sequence:
[Paste saveAllItems logs here]
```

---

## Test 4: Edit Existing Task - Add Checklist

### Steps:
1. **Clear console**
2. Click an existing task to edit it
3. Click the "•••" menu
4. Click "Add Checklist"
5. **WATCH CONSOLE** for:
   - `[SortableTaskItem] handleAddChecklist called`
   - `[SortableTaskItem] handleAddChecklist - loading checklist items`
   - `[UnifiedChecklistSection] AUTO-CREATING FIRST ITEM` (if this appears)
   - `[toDoStore] addChecklistItem called` (if this appears)

### Expected Behavior (Current Bug):
- **Should create**: 1 empty checklist item
- **Bug**: Might create 2 empty checklist items

### Questions to Answer:
- [ ] How many items are created when clicking "Add Checklist"?
- [ ] Does `AUTO-CREATING FIRST ITEM` get logged?
- [ ] Does `addChecklistItem` get called immediately?
- [ ] What's the exact sequence?

### Log Your Findings:
```
Number of items created: ___
AUTO-CREATING logged: Yes / No
addChecklistItem called: Yes / No / How many times: ___

Console log sequence:
[Paste relevant logs here]
```

---

## Test 5: Add Items in Edit Mode

### Steps:
1. Continue from Test 4 (in edit mode with checklist)
2. Type "Edit mode item 1" in checklist input
3. Press Enter
4. **WATCH CONSOLE** for:
   - `[UnifiedChecklistSection] handleAddItemAfter called`
   - `[toDoStore] addChecklistItem called`
   - `[toDoStore] addChecklistItem - DB item created`

### Expected Behavior:
- Each Enter creates exactly 1 item
- Item is saved to database immediately

### Questions to Answer:
- [ ] How many items created after 1 Enter press?
- [ ] Did the item get saved to database?
- [ ] Any duplicate items?
- [ ] Compare timestamps - how long did DB save take?

### Log Your Findings:
```
Items after 1 Enter: ___
DB save successful: Yes / No
DB save duration: ___ ms
Any duplicates: Yes / No

Console log sequence:
[Paste relevant logs here]
```

---

## Test 6: Save Changes in Edit Mode

### Steps:
1. Continue from Test 5 (should have checklist items in edit mode)
2. Edit one of the checklist items (change the text)
3. **Clear console**
4. Click "Save" button
5. **WATCH CONSOLE** for any save-related logs

### Expected Behavior:
- Changes should be persisted
- When you reopen the task, changes should still be there

### Questions to Answer:
- [ ] Do you see any `saveAllItems` calls? (You shouldn't - edit mode saves directly)
- [ ] After clicking Save and reopening, are changes preserved?
- [ ] Any errors in console?

### Log Your Findings:
```
Changes preserved: Yes / No
Any saveAllItems calls: Yes / No
Any errors: Yes / No

Console log sequence:
[Paste relevant logs here]
```

---

## Test 7: Compare Create vs Edit Behavior

### Analysis Questions:
Based on Tests 1-6, compare the two flows:

1. **Item Creation:**
   - Create mode: Uses `handleAddTempChecklistItem` (temp local state)
   - Edit mode: Uses `addChecklistItem` from store (DB immediately)
   - Are they consistent? _____________

2. **Save Strategy:**
   - Create mode: Batch save via `saveAllItems` on submit
   - Edit mode: Individual saves on each change
   - Is this causing issues? _____________

3. **Auto-creation:**
   - Does both Create and Edit auto-create first item? _____________
   - If yes, is that causing duplicates? _____________

4. **Root Cause Hypothesis:**
   Based on your testing, what do you think is causing the bugs?
   ```
   Double item creation:
   [Your hypothesis]

   Save issues:
   [Your hypothesis]

   Inconsistent behavior:
   [Your hypothesis]
   ```

---

## Test 8: Edge Cases

### Test 8a: Rapid Enter Presses
1. Open create task with checklist
2. Press Enter rapidly 5 times
3. **Count**: How many items were created? ___
4. **Expected**: 5 items (or fewer if preventing empty items)
5. **Actual**: ___ items

### Test 8b: Create and Immediately Cancel
1. Open create task
2. Add checklist with 2 items
3. Click "Cancel"
4. Check database/state - any orphaned items? Yes / No

### Test 8c: Network Offline
1. Open dev tools Network tab
2. Set to "Offline" mode
3. Try to add checklist items in edit mode
4. **Expected**: Should queue or show error
5. **Actual**: __________________________

---

## Summary: Bugs Confirmed

After completing all tests, fill this out:

### Bug 1: Double Item Creation
- [ ] Confirmed in Create mode
- [ ] Confirmed in Edit mode
- [ ] Not reproducible

**Root cause based on logs:**
```
[Your analysis]
```

### Bug 2: Save Issues
- [ ] Items lost in Create mode
- [ ] Items lost in Edit mode
- [ ] Changes not persisted
- [ ] Not reproducible

**Root cause based on logs:**
```
[Your analysis]
```

### Bug 3: Inconsistent Behavior
- [ ] Create and Edit behave differently
- [ ] Both modes behave the same
- [ ] Other inconsistencies noted

**Specific differences:**
```
[Your notes]
```

---

## Next Steps

Once testing is complete:

1. **Share findings** - Copy/paste your test results
2. **Review console logs** - Look for patterns
3. **Confirm root causes** - Based on evidence
4. **Proceed to Phase 1** - Implement fixes based on confirmed bugs

---

## Tips for Testing

- **Use timestamps** in console logs to track timing issues
- **Take screenshots** of console logs showing the bug
- **Test multiple times** to ensure reproducibility
- **Clear console** between tests for clarity
- **Watch network tab** to see database calls
- **Check Supabase dashboard** to see what's actually in the database

---

## Reporting Format

When you're done testing, report back with:

```markdown
## Test Results Summary

**Date**: [Date]
**Tester**: [Your name]
**Environment**: localhost:3001

### Confirmed Bugs:
1. [Bug description] - Severity: High/Medium/Low
2. [Bug description] - Severity: High/Medium/Low

### Root Causes Identified:
1. [Component/File]: [Issue]
2. [Component/File]: [Issue]

### Console Log Evidence:
[Paste key console logs that show the bugs]

### Next Steps:
[What fixes should be prioritized]
```
