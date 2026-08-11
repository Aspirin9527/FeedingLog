# Baby Feeding Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deployable responsive local-first baby feeding tracker with record entry, daily summaries, calendar history, and JSON backup.

**Architecture:** Use a static Vite React app. Keep domain logic in pure TypeScript modules, keep IndexedDB behind a storage adapter, and keep UI components focused by screen.

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library, IndexedDB, CSS.

---

## File Structure

- `package.json`: scripts and dependencies.
- `index.html`: Vite HTML entry.
- `vite.config.ts`: Vite and Vitest config.
- `tsconfig.json`, `tsconfig.node.json`: TypeScript config.
- `src/main.tsx`: React entry.
- `src/App.tsx`: application shell, view state, storage wiring.
- `src/styles.css`: responsive UI styles.
- `src/types.ts`: shared feeding record and backup types.
- `src/domain/feeding.ts`: pure validation, creation, grouping, summaries, export/import merge logic.
- `src/domain/feeding.test.ts`: unit tests for core feeding behavior.
- `src/storage/feedingStore.ts`: IndexedDB persistence adapter.
- `src/storage/feedingStore.test.ts`: IndexedDB integration tests with fake-indexeddb.
- `src/components/HomeView.tsx`: record-first home screen and today's timeline.
- `src/components/CalendarView.tsx`: monthly calendar and selected-day details.
- `src/components/StatsView.tsx`: recent daily summaries.
- `src/components/BackupView.tsx`: JSON export/import UI.
- `src/components/icons.tsx`: compact inline icon components.
- `src/vite-env.d.ts`: Vite type declarations.

## Tasks

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `src/vite-env.d.ts`

- [ ] **Step 1: Add project configuration**

Create a Vite React TypeScript app configuration with scripts:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: dependencies install and `package-lock.json` is created.

### Task 2: Domain Logic With TDD

**Files:**
- Create: `src/types.ts`
- Create: `src/domain/feeding.test.ts`
- Create: `src/domain/feeding.ts`

- [ ] **Step 1: Write failing domain tests**

Tests must cover:

```ts
createFeedingRecord({ amountMl: 120, fedAt: '2026-08-11T03:00:00.000Z' }, now)
validateAmountMl('120')
getDateKey('2026-08-11T23:30:00.000Z')
summarizeByDay(records)
getRecordsForDate(records, '2026-08-11')
buildBackup(records, now)
mergeImportedRecords(existing, imported)
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `npm test -- src/domain/feeding.test.ts`

Expected: fail because `src/domain/feeding.ts` does not exist yet.

- [ ] **Step 3: Implement pure domain module**

Implement validation, record creation, local-date grouping, daily summaries, backup creation, backup parsing, and merge-by-id with newer `updatedAt` winning.

- [ ] **Step 4: Run tests and confirm GREEN**

Run: `npm test -- src/domain/feeding.test.ts`

Expected: all domain tests pass.

### Task 3: IndexedDB Storage With TDD

**Files:**
- Create: `src/storage/feedingStore.test.ts`
- Create: `src/storage/feedingStore.ts`

- [ ] **Step 1: Write failing storage tests**

Tests must cover:

```ts
const store = new FeedingStore('test-db')
await store.save(record)
await store.getAll()
await store.delete(record.id)
await store.replaceAll([record])
```

- [ ] **Step 2: Run tests and confirm RED**

Run: `npm test -- src/storage/feedingStore.test.ts`

Expected: fail because storage implementation does not exist yet.

- [ ] **Step 3: Implement IndexedDB adapter**

Implement open database, object store creation, `getAll`, `save`, `delete`, and `replaceAll`.

- [ ] **Step 4: Run tests and confirm GREEN**

Run: `npm test -- src/storage/feedingStore.test.ts`

Expected: all storage tests pass.

### Task 4: Responsive UI

**Files:**
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/components/HomeView.tsx`
- Create: `src/components/CalendarView.tsx`
- Create: `src/components/StatsView.tsx`
- Create: `src/components/BackupView.tsx`
- Create: `src/components/icons.tsx`
- Create: `src/styles.css`

- [ ] **Step 1: Build record-first app shell**

Implement four views: Home, Calendar, Stats, Backup. Keep mobile bottom tabs and desktop two-column home layout.

- [ ] **Step 2: Wire storage**

Load records from IndexedDB on startup, save records on new entry, delete records, and refresh derived summaries from React state.

- [ ] **Step 3: Wire backup UI**

Export JSON backup with a date-based filename. Import JSON and merge into existing records.

- [ ] **Step 4: Run tests**

Run: `npm test`

Expected: all tests pass.

### Task 5: Build and Browser Verification

**Files:**
- Modify as needed based on verification.

- [ ] **Step 1: Build**

Run: `npm run build`

Expected: TypeScript and Vite build succeed and produce `dist/`.

- [ ] **Step 2: Start dev server**

Run: `npm run dev -- --port 5173`

Expected: local app available at `http://127.0.0.1:5173/`.

- [ ] **Step 3: Verify desktop and mobile in browser**

Use browser automation to verify:

- Add a feeding record and today's total changes.
- Calendar shows the selected day total and detail.
- Delete a record updates total.
- Backup export/import controls are present.
- Desktop viewport and 390px mobile viewport do not show broken layout or overlapping controls.

- [ ] **Step 4: Commit implementation**

Run:

```bash
git add .
git commit -m "Build baby feeding tracker app"
```
