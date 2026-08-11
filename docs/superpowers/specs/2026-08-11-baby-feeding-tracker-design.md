# Baby Feeding Tracker Design

## Goal

Build a responsive baby feeding tracker that can be opened on desktop and mobile devices. The app records feeding time and milk volume, summarizes milk volume by day, shows historical daily details from a calendar, and is easy to deploy to common cloud platforms.

The first version is a local-first web app. Data is stored in the user's browser with IndexedDB and can be exported/imported as JSON for backup. It does not require login, a backend service, or a database.

## Scope

Included:

- Record a feeding event with timestamp and milk volume in milliliters.
- Default the feeding time to the current time when the user records a feed.
- Let the user edit the time before saving when needed.
- Show today's total milk volume and feeding count on the home screen.
- Show today's feeding timeline with time and milk volume.
- Support deleting an incorrect record.
- Show a monthly calendar where each day displays the total milk volume.
- Let the user select a calendar date and view all feeding records for that date.
- Show daily summary statistics for recent days.
- Export all data to a JSON backup file.
- Import a JSON backup file and merge it into local data.
- Work well on desktop and mainstream mobile screen sizes.
- Be deployable as a static site.

Not included in the first version:

- Multi-device sync.
- Accounts or authentication.
- Cloud database storage.
- Push reminders.
- Medical advice or feeding recommendations.

## User Experience

The app uses a record-first layout.

On the home screen, the highest-priority action is adding a feeding record. The top area shows today's summary: total milk volume and number of feeds. The main input area includes milk volume, feeding time, common volume shortcuts, and a clear save button. The lower area shows today's records in reverse chronological order.

Navigation is compact:

- Home: record feeding and view today's entries.
- Calendar: inspect historical daily totals and details.
- Stats: review daily summaries.
- Backup: export and import data.

On mobile, navigation appears as a bottom tab bar. On desktop, the app uses a wider layout with the recording panel and daily timeline visible together when space allows.

## Data Model

Each feeding record has:

- `id`: stable unique string.
- `fedAt`: ISO timestamp.
- `amountMl`: positive integer milk volume.
- `createdAt`: ISO timestamp.
- `updatedAt`: ISO timestamp.

Derived daily summaries are computed from records:

- `date`: local date key in `YYYY-MM-DD`.
- `totalMl`: sum of all feeding amounts on that date.
- `count`: number of feeding records on that date.
- `records`: records for that date sorted by feeding time.

The app treats dates in the user's local timezone.

## Storage

IndexedDB is the primary storage engine because it is better suited than localStorage for structured data and larger history. The app stores feeding records in one object store keyed by `id`, with an index on `fedAt`.

Data may remain for months or years under normal browser behavior, but local browser storage is not a durability guarantee. The backup feature is part of the core design so users can preserve records for the expected six-to-twelve-month retention window.

Import behavior:

- Validate that the file has the expected backup shape.
- Validate each record's required fields and amount.
- Merge records by `id`.
- Prefer the imported record when its `updatedAt` is newer.
- Show a clear success or error message.

Export behavior:

- Export all records.
- Include schema version and export timestamp.
- Name files with a date-based filename.

## Responsive Design

The layout uses responsive CSS without fixed desktop assumptions.

Targets:

- Small phones around 360px wide.
- Modern large phones around 390px to 430px wide.
- Tablets.
- Desktop browser widths.

Controls use stable dimensions so buttons, inputs, calendar cells, and tab navigation do not shift when content changes. Text should wrap cleanly without overlapping. The calendar keeps readable day numbers and total milk labels on narrow screens.

## Deployment

The app should be implemented as a static single-page application that can be built into files under `dist/`.

Deployment targets:

- Vercel.
- Netlify.
- Cloudflare Pages.
- Any static file server.

No server-side environment variables are required in the first version.

## Testing

Automated tests should cover:

- Creating feeding records.
- Validating milk amount.
- Grouping records by local day.
- Computing daily totals and counts.
- Import merge behavior.
- Export backup shape.

Manual/browser verification should cover:

- Record a feed and see today's total update.
- Select a calendar day and see the day's records.
- Delete a record and see summaries update.
- Export data.
- Import data.
- Check responsive layout at desktop and mobile viewport sizes.

## Implementation Notes

Use a small front-end stack suitable for static deployment. A Vite-based React app is a good fit because it builds quickly, has simple deployment output, and supports component-based UI and tests.

The app should avoid backend assumptions. All persistence code should live behind a small storage module so a future cloud-sync version can replace the implementation without rewriting the UI.
