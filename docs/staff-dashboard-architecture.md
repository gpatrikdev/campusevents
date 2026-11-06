# Staff dashboard architecture

Implemented 6 November 2026. This records the architecture for the staff event collection and event management pages within the approved Astryx Neutral system. Implementation verification appears below.

## Baseline review

The problem is composition. The application already uses Astryx, but the staff pages largely arrange individual controls in stacks without using its page regions, collections, or contextual navigation.

Observed in the running preview:

- At desktop width, each event occupies four vertically stacked lines across a wide region. Five events consume almost the entire viewport even though the information would fit in aligned columns.
- The event page gives links to other screens the appearance of action buttons. Public preview, attendees, scanning, reviews, publication, and deletion compete for attention.
- There is no event breadcrumb or persistent navigation between attendees, scanning, and reviews. Each destination rebuilds its own heading.
- On mobile, the metadata wraps into uneven groups and task buttons span several rows. These regions need a deliberate compact layout.
- Returning from a draft to the collection resets the selected filter to Upcoming.
- The ongoing event displays both an instruction to unpublish before editing and an explanation that unpublishing is no longer possible.
- Simulated empty and error states replace the entire event page, including its heading. The empty event page uses collection-specific guidance about choosing a filter.

## Visual direction

Use a restrained staff workspace with a clear page heading, an aligned collection, and a consistent event frame. Give navigation, information, and mutations distinct places.

Retain the existing `AppShell`, global navigation, staff sidebar, and mobile drawer. The global navigation connects public events, registrations, and the dashboard; the staff sidebar connects event management and admin permissions. This pass changes the content inside that frame.

Use the installed Neutral theme and its Figtree font for headings and body text. The observed light-theme values below describe existing tokens; they are not CSS overrides.

| Role            | Existing token               | Observed light value |
| --------------- | ---------------------------- | -------------------- |
| App background  | `--color-background-body`    | `#f1f1f1`            |
| Content surface | `--color-background-surface` | `#ffffff`            |
| Main text       | `--color-text-primary`       | `#000000`            |
| Supporting text | `--color-text-secondary`     | `#474747`            |
| Dividers        | `--color-border`             | `#00000014`          |

Use normal Astryx heading and body roles. Keep metadata readable in the secondary color. Use tight spacing within a row and more space between regions. One container owns each region's padding so the heading, tabs, and row text share a content line.

Use `Section` for page regions and `Table` or `List` for collections. Following the user's refinement, use `Badge` for publication, registration, and attendee check-in states. Keep the state label visible so color is supplementary.

## Staff event collection

Shorten the heading to "Events" within the dashboard context. Keep "Create draft" as the primary action. Below the heading, a one-line description says what staff do here, matching the description under the Permissions heading. The drafts rule is easy to miss in that line, so it sits in a dismissable info `Banner` at the top of the content, as the admin note does on Permissions: "Drafts are visible to staff only." as the title and "Publish a draft more than 24 hours before it starts." as the description.

```text
Events                                                    [Create draft]
Create and publish events, then manage their attendees and check-in.
----------------------------------------------------------------------------------------
(i) Drafts are visible to staff only.                                                [x]
    Publish a draft more than 24 hours before it starts.

Status
[Upcoming v]

Event                    Date and time          Timezone         Location    Registration status
Student research forum   4 Nov, 11:00-15:00      Europe/Budapest  Main hall   Closed
Responsible AI           6 Nov, 10:00-16:00      Europe/Budapest  Science     Open
```

The wireframe shows information placement, not final spacing or translated labels.

- Use `Layout`, `LayoutHeader`, and `LayoutContent` for the page regions. Put the Draft, Upcoming, Ongoing, and Past options in a "Status" `Selector` inside a filter bar above the table. The bar is a wrapping `HStack` named "Event filters", as the Selector docs recommend, so later filters sit beside Status and move to a second line on phones. Upcoming contains published events that have not started; Ongoing contains published events from their start until their end.
- Use an Astryx `Table` at every width, built with the data-driven API and `proportional()` column widths. Its `Card` wrapper supplies the rounded outer border, matching the official Table showcase. When the columns don't fit, the table scrolls sideways inside its card. Keep the existing event ordering. Add no selection, bulk actions, sorting, saved views, or pagination controls.
- Use Event, Date and time, Timezone, and Location columns. Upcoming and Ongoing also show a "Registration status" column with "Open" or "Closed" values. Draft and Past omit that redundant column. Ongoing status belongs to its filter, rather than a label beside the title.
- Leave a spacing-6 gap between the filter bar and the table. Keep every table value on one line, truncating long values with Astryx text controls.
- Keep event titles as real links to staff management. Table rows must not become mouse-only navigation targets.
- Permissions and the attendee list use the same Card-wrapped table, so every staff table looks and scrolls the same way.
- Reuse `formatDateRange` for same-day and multi-day events. Keep the timezone explicit for every event.
- Preserve the selected filter through event navigation and browser Back, using a validated router search value with Upcoming as the default.
- Keep the header and filters visible during loading, empty, and error states. Render the existing `DataBoundary` inside the collection region.

## Event management frame

Create one shared event layout for the management overview, attendees, QR scanner, and review results. It owns the event identity and navigation, rather than repeating them in every page.

```text
Events / Open science in practice

Open science in practice                              [external link]
[Published]

Overview     Attendees     QR scanner     Review results
-------------------------------------------------------------------
                     [Scan QR tickets] [Unpublish event | Delete event]
             Published details are locked. This event has already started.

Event details
Date and time (i)                       Location
Starts at  3 Nov 2026, 11:00             Central Library · Seminar room 2
Ends at    3 Nov 2026, 14:00
Timezone   Europe/Budapest

About this event
Existing rich-text description and programme
```

This example uses the preview's reference clock, when Open science is ongoing. The displayed actions follow the current event state.

| Region          | Astryx composition                                | Responsibility                                                                          |
| --------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Context         | `Breadcrumbs`, `BreadcrumbItem`                   | Return to staff events and identify the current event/task.                             |
| Header          | `LayoutHeader`, `Heading`, `Badge`, `IconButton`  | Event title, publication badge, and public-page/preview icon at the far right.          |
| Task navigation | `TabList`, link-based `Tab` items                 | Overview, attendees, scanning, and results at their existing URLs.                      |
| Overview        | `Grid`, `MetadataList`, `InfoTip`, `RichTextView` | Schedule and location sections, timezone help, and the existing description.            |
| Event mutations | `ButtonGroup` and existing `ConfirmDialog`        | Publication, draft editing, and direct deletion, with consequences before confirmation. |
| Task body       | Existing attendee/scanner/results page            | The selected task without another copy of the event header.                             |

The event navigation changes routes, so use link navigation semantics rather than `role="tablist"`. Keep its active state in sync with the route and preserve normal browser link behavior. The collection uses a "Status" `Selector` rather than tabs.

On subpages, the event title remains the `h1`; the task title becomes an `h2`. Focus the newly opened task heading on navigation and include the event and task in the browser title.

Keep the draft editor's existing form layout and the exact public event preview outside this management frame. Reuse the public event component for preview without recreating its content or adding a second page heading.

The editor and Permissions still share the dashboard's page frame: a `Layout` header with a divider and the same insets as the event collection. The editor's header adds an "Events / event title / Edit draft" breadcrumb, or "Events / Create an event" for a new draft. Only the public preview uses the padded public-page frame.

### Actions and supporting details

On Overview only, right-align an Astryx `ButtonGroup` labelled "Event actions" for Publish/Unpublish, Edit draft when applicable, and Delete event. There is no action dropdown. Preserve the existing confirmation wording. Align publication guidance below the controls. Attendees, scanning, and results omit this management region.

Keep public-page navigation outside this group: the title row uses an external-link `IconButton`, with a secondary surface, low elevation, a translated label and tooltip, at its far right. Drafts use the same position for their preview. The existing client-link adapter preserves preview routing and normal browser link behavior.

When check-in is open, Overview also shows a separate primary "Scan QR tickets" link to the scanning task. The task navigation remains available in every event state.

The overview separates Starts at, Ends at, and Timezone from Location. An `InfoTip` beside Date and time explains that these times use the event's timezone. The existing rich-text event description appears below a divider.

The shared `ScannerLayout` places scan controls above a bounded camera viewport, with scan feedback between the controls and camera. A separate 20rem information panel contains the check-in window and scanning instructions, divided into their own sections. Below 64rem, this information stacks beneath the camera; the controls stay above it. It presents both the sample scanner and live camera scanner without changing ticket validation or camera cleanup.

Review empty states span the full content width and center within it. Populated results retain a 50rem reading width.

Reuse the current business-rule helpers. Publication still requires more than 24 hours before the start. Unpublishing still clears registrations and invalidates tickets and is allowed only before the start. Check-in still runs from one hour before the start until the event end. Deletion remains available for all event states. Review results remain staff-only and anonymous.

## Responsive and accessible behavior

- Keep the existing AppShell mobile navigation breakpoint. Use one document scroll surface.
- Keep tables at every width. Below their column floors they scroll sideways inside the card, and the scroll region takes keyboard focus. On phones, the last columns, such as the Permissions role control, need a sideways swipe.
- At widths up to 64rem, use the vertical `ButtonGroup` orientation. Keep the external-link icon at the far right of the title. At compact widths, switch `MetadataList` labels above their values. Full timezone and location values must wrap without clipping.
- Keep event navigation in Astryx's scrolling tab strip on narrow screens. Preserve full labels, the active-item indicator, and keyboard access.
- Keep controls at one size within each group. Provide comfortable touch areas with theme spacing; a larger size name alone is insufficient because the installed core size tokens range from 28 to 36 pixels.
- Preserve visible focus, Escape handling, confirmation focus return, and status/error announcements. Keep navigation usable in loading and failure states whenever the event identity is known. Missing/deleted events use the existing unavailable-event notice with an appropriate page heading.
- Add English and Hungarian strings together. Event content remains in the language in which it was written.

## Implementation boundaries

| File or area                                                              | Proposed responsibility                                                                                                                |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `src/pages/StaffPages.tsx`                                                | Collection composition and management overview. Keep collection rendering local to this feature.                                       |
| `src/components/StaffEventLayout.tsx`, new                                | Shared event heading, breadcrumb, task navigation, and contextual event actions.                                                       |
| `src/components/ScannerLayout.tsx`, new                                   | Shared responsive scanner viewport, check-in window, controls, and result placement.                                                   |
| `src/components/EventIcons.tsx`, new                                      | Small outline SVGs rendered through Astryx `Icon` where no semantic registry name exists.                                              |
| `src/routes/staff.events.$eventId.tsx`                                    | Mount the shared management frame for its applicable child routes. Preserve the editor and public preview layouts.                     |
| `src/routes/staff.tsx`                                                    | Validate and retain the collection filter across the staff routes, including event navigation and browser Back.                        |
| `src/pages/AttendeesPage.tsx`, `ScannerPage.tsx`, `ReviewResultsPage.tsx` | Keep task behavior; remove duplicate event headings when placed in the shared frame.                                                   |
| `src/components/SiteShell.tsx`                                            | Allow the staff page layout to own its insets; support staff route focus and descriptive browser titles. Scope changes to staff pages. |
| `src/app.css`, `src/i18n/hu.ts`                                           | Minimal token-based responsive rules and matching Hungarian labels.                                                                    |

Reuse `DataBoundary`, `ConfirmDialog`, existing time formatting, access notices, and domain-rule helpers. Public events and registrations retain their current layouts. No additional library, backend redesign, or general-purpose dashboard framework is needed.

## Evidence and verification

Reviewed the running `dev:preview` server on port 5175 and verified its process uses this checkout. Used only preview identities and in-memory sample data. The reference clock was 3 November 2026, not the machine's current date.

Inspected desktop and narrow English/Hungarian views, Draft/Upcoming/Past filters, publishable and blocked drafts, an ongoing published event, attendee navigation, simulated empty/error states, and retry recovery. Keyboard Tab and arrow movement worked in the collection filters; Enter selected the focused filter. Browser Back reproduced the filter reset. The current Hungarian metadata fits at both 375 and 390 pixels; the proposed single-column treatment improves its grouping.

Current screenshots are local review evidence, not redesign mockups. They remain in the Git-ignored `.playwright-mcp` directory:

- [Staff list, desktop](../.playwright-mcp/staff-list-desktop-before.png)
- [Event management, desktop](../.playwright-mcp/staff-event-desktop-before.png)
- [Event management, Hungarian mobile](../.playwright-mcp/staff-event-mobile-hu-before.png)
- [Staff list, Hungarian mobile](../.playwright-mcp/staff-list-mobile-hu-before.png)

The console reported a favicon 404; no application runtime error or failed API request appeared during these preview checks. Astryx doctor reported zero failures, with existing RichText documentation metadata and external-font verification warnings. The browser reported loaded Figtree faces.

The preceding observations and screenshots describe the baseline review. That review did not run a production build, backend tests, camera scanning, real authentication, email delivery, or production mutations.

## Implementation verification

The implementation retains the existing Neutral theme, domain rules, and public event preview. The user approved updating Core, CLI, Neutral, and RichText together from 0.7.6 to 0.7.9 to use `InfoTip`. The official upgrade command required no source codemods and refreshed only the version/count in the managed AGENTS.md block.

The validated filter lives on the parent staff route so breadcrumbs, event tasks, editing, and browser Back preserve it. Known event identity remains visible while another task loads or fails; mutations are disabled while data is unavailable.

Passed `pnpm typecheck`, `pnpm check`, `pnpm test` with 38 tests, and `pnpm build`. Astryx's built-output diagnostic reported zero failures, retaining the existing font-verification and RichText metadata warnings. The build reports large-chunk warnings.

Playwright MCP checks covered:

- English and Hungarian desktop and mobile views, a 900-pixel tablet view, and an 844-by-390 landscape viewport. No horizontal document overflow appeared in the inspected layouts.
- Draft, Upcoming, and Past filters; keyboard selection; browser Back and breadcrumb filter persistence; task heading focus; and route-specific browser titles.
- Publishing and unpublishing sample data, deletion and cancellation, a blocked publication, unavailable unpublishing after the start, and an announced failed deletion that retained the event.
- Attendee search with no results, simulated QR and duplicate scans, empty review results, loading/empty/error states, and retry recovery.
- The original rich-text draft editor and public preview, a long Hungarian title and location at 375 pixels, and same-day/multi-day formatting in both languages.
- Touch input with a coarse pointer and reduced motion. A fresh browser context reported no page errors, console errors, or failed requests.

All mutations used in-memory preview data. Original sample data was restored afterward. No production data, real email, or certificate issuance was used.

Local result screenshots:

- [Staff collection after the single-row and Ongoing-filter update](../.playwright-mcp/staff-list-single-row-detail.png)
- [Bordered event table and registration badges](../.playwright-mcp/staff-table-bordered-desktop.png)
- [Event details and grouped actions](../.playwright-mcp/event-details-grouped-desktop.png)
- [Event details, Hungarian mobile](../.playwright-mcp/event-details-grouped-mobile-hu.png)
- [Scanner layout with controls above the camera](../.playwright-mcp/scanner-controls-top-after.png)
- [Scanner layout, Hungarian mobile](../.playwright-mcp/scanner-controls-top-mobile-hu.png)
- [Centered review empty state](../.playwright-mcp/reviews-centered-grouped-desktop.png)

`pnpm test:worker` could not start because `TEST_DATABASE_URL` is unset. API integration tests against a migrated test database and real camera scanning remain unverified in this pass.

The follow-up collection changes passed type checking, Biome, all 38 existing tests, the production build, and Astryx's built-output diagnostic. Browser checks confirmed a 24-pixel filter/table gap, single-line table values, full Hungarian column headings, truncation tooltips, mobile filters, keyboard selection, and filter persistence. At the exact start an event appears in Ongoing; at its end it leaves Ongoing and appears in Past. The reference preview clock was restored after these checks.

The final component checks verified the bordered table and status badges, raised public-page icon, and right-aligned management controls visible on Overview only. English and Hungarian layouts, horizontal and vertical ButtonGroup keyboard navigation, confirmation focus return, and InfoTip keyboard/touch pinning and dismissal passed. Reviews center across the available width; populated results retain their reading width. Sample scans and duplicate scans passed with the shared scanner layout. A fresh touch context reported no page errors, console errors, or failed requests. Original sample data was restored.

The frame and table follow-up moved Permissions and the editor into the dashboard frame and replaced the phone list with the table. Checked in the preview at 390, 900, and 1280 pixels:

- At 900 pixels, Permissions no longer runs past the main column, and its role control scrolls into view.
- Phone margins are 16 pixels on every dashboard page.
- Loading and error states keep the page header, and the editor doesn't report its event missing while data loads.
- The unsaved-changes prompt still appears when you leave through the new breadcrumb.
- Arrow keys scroll a focused table.

The rich-text toolbar keeps its small controls on phones, so the touch-target rule skips it.

A later change replaced the collection's filter tabs with the "Status" selector and gave the Events heading its description. Permissions now shows "Admin roles are managed manually and cannot be changed here." in a dismissable info `Banner` above the search field instead of a footnote. Checked in the preview:

- Choosing a filter with the keyboard updates the URL and the table.
- Browser Back and the breadcrumb keep the chosen filter.
- A dismissed banner returns on the next visit.
- English, Hungarian, and dark mode show no page overflow at 390, 900, or 1280 pixels.

A later change moved the drafts rule from the Events description into an info `Banner` and gave the heading a new description. The banner's dismiss button works from the keyboard and has a translated label.

The scanner follow-up verified controls above the camera at 1440, 1024, 900, and 375 pixels, with check-in information separate from controls and feedback. English and Hungarian layouts, keyboard selection and activation, touch scanning, and an 844-by-390 landscape view passed without document overflow. Valid, duplicate, and invalid sample scans retained their outcomes. The camera capture and cleanup code was unchanged; physical camera scanning remains unverified.
