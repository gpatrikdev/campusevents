# Campus Events

A runnable frontend preview of the approved university event service. All records and identities are sample data. Changes are kept in memory until reset or reload.

## Run locally

Use Node 22.13 or later in the 22.x line, Node 24, or Node 26+, and pnpm 12.8.1.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open [the local preview](http://127.0.0.1:5173/). The server binds only to this computer. No environment variables or external accounts are required.

```sh
pnpm typecheck
pnpm check
pnpm test
pnpm build
pnpm preview
```

`pnpm preview` serves the production build at [127.0.0.1:4173](http://127.0.0.1:4173/). `pnpm format` applies Biome's safe formatting and lint fixes. Lefthook is installed in this checkout and runs `pnpm check` before commits. Run `pnpm hooks:install` after creating or cloning a Git checkout elsewhere.

## Included interfaces

- Public upcoming/ongoing events and event details. Past published pages remain accessible by direct link. Drafts stay out of the public listing.
- Google sign-in simulation, magic-link email preview, immutable first-login name confirmation, and return to the original event before explicit registration.
- Profile with Registrations and Account tabs, generated sample QR tickets, cancellation, review eligibility, and one-time certificate-request states.
- Staff event filters, draft creation/editing with Astryx RichText, shared public-page preview, publication controls, attendee search, scanner simulation, and anonymous review results.
- Admin organizer-role changes. Admin accounts have no role-editing control. Promotion preserves existing registrations.
- English and Hungarian product text, Astryx controls, and SurveyJS validation. Event content stays in its original language.

Astryx Neutral supplies the theme, fonts, icons, controls, and default styles. Layouts were adapted from the CLI's top-navigation, detail, sign-in, settings, table, and RichText examples. App CSS only caps/centers content and sizes QR images. SurveyJS v3 semantic tokens map to the existing Astryx theme.

## Explore the scenarios

Open **Preview controls** at the top of every page. The reference clock is **3 November 2026, 12:00 Europe/Budapest**. It never advances automatically.

| Control                  | Use                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| Visitor                  | Public listing, event pages, and the sign-in preview.                                                                          |
| First login              | Confirm a profile name. Every sign-in preview uses this sample identity; an entered email is never authenticated or contacted. |
| Attendee · Eszter        | Existing tickets, one eligible review/certificate, a missed event, and already completed post-event actions.                   |
| Organizer · Anna         | Manage all events, scan sample tickets, and read reviews.                                                                      |
| Admin · Balázs           | The same event tools plus organizer permissions.                                                                               |
| Demo clock               | Exact registration cutoff, check-in opening, start, end, and review cutoff for **The future of responsible AI**.               |
| Data state               | Deterministic ready, loading, empty, and error views. **Try again** restores ready data.                                       |
| Simulate action failures | Exercise rejected local changes. A failed certificate simulation consumes its one request, as specified.                       |
| Reset sample data        | Restore all fixtures, the reference time, and visitor identity.                                                                |

For scanner scenarios, select a staff identity and open **Dashboard → Open science in practice → Scan QR tickets** at the reference time. It has an active ticket, a checked-in attendee, and a cancelled ticket. A valid sample scan changes only local attendance; repeat scans report the existing check-in.

To inspect review results, use **Dashboard → Past → Research ethics roundtable → Review results**. Submit a review first as Eszter to see the local aggregate update. Names and email addresses are absent from the results view.

To test promotion, grant Eszter organizer access as the admin, then switch back to Eszter. Her profile retains its tickets and post-event actions; new event registration is unavailable.

## Structure

```text
src/
  routes/       TanStack file routes and route parameters
  pages/        Public, attendee, staff, and admin screens
  components/   Shared shell, feedback, confirmations, event rows, ticket dialog
  domain/       Types, input validation, deadline/permission rules, formatting
  mocks/        Sample fixtures, local actions, provider, and query hooks
  reviews/      The fixed SurveyJS form and Neutral token mapping
  i18n/         English/Hungarian resources and coverage check
```

The mock fixtures are separate from the components. `mocks/hooks.ts` contains the small event query to replace with an API call; `mocks/actions.ts` contains synchronous local changes. There is no mock HTTP server, authentication provider, or general-purpose mock framework. Real integration should replace these boundaries while retaining the pages and domain contracts.

Time rules use instant arithmetic for the elapsed 24-hour, one-hour, and 72-hour windows. Temporal converts staff-entered local times using the chosen IANA timezone. Invalid and ambiguous daylight-saving times are rejected. Date/time fields and the RichText toolbar are Astryx components.

## Validation

- TypeScript, Biome's recommended lint rules and formatter, Vitest, and the Vite production build.
- 38 tests cover permissions, exact deadline boundaries, duplicate registration/scans/reviews/requests, cancellation and unpublish invalidation, deletion, role promotion, immutable names, draft content, simulated failures, daylight-saving transitions, and literal translation coverage.
- Browser checks use the built-in browser because Playwright MCP is unavailable. Desktop and mobile checks cover both languages, navigation, the join flow, QR dialog/focus return, cancellation, the review form, certificate requests, staff editing/preview/publication, attendee search, scanner states, organizer management, and read-state recovery.
- Fresh final browser sessions had no console errors or warnings. The compiled preview rendered event content correctly, and all 64 local production assets returned HTTP 200.
- No Playwright test suite was added. Workers execution, database constraints, real authentication, email/PDF delivery, camera decoding, real device cameras, and multiple browser engines are not validated in this phase.

`pnpm exec astryx doctor --built dist` checks the compiled theme setup. The supplied RichText package currently reports CLI documentation-metadata warnings, and the CLI cannot prove an externally loaded font is available. These are package diagnostics rather than application TypeScript or build errors. The Neutral font must load from the theme's supplied font stylesheet.

The source scan also flags the intentional class names and CSS imports used for page sizing and SurveyJS. Plain CSS and the embedded SurveyJS renderer are approved parts of this setup.

Large vendor-chunk warnings from the approved RichText and SurveyJS packages remain visible in the build output. Route splitting is enabled; no warning threshold was raised.

## Deliberately simulated

No real user signs in. No messages leave the application. No certificate PDF is created, issued, or emailed. The QR images are real images encoding `DEMO-...` tokens and work only with local fixtures. The scanner has no active camera and uses sample QR-scan controls. Roles and checks in this client are demonstrations, not production security.

No production backend, Workers entry, deployment configuration, database, authentication, email integration, or background jobs have been added. Their packages and credentials remain deferred. Nothing has been deployed or published.

## Documentation used

[Astryx setup](https://astryx.atmeta.com/docs/getting-started), the installed Astryx CLI component docs, [TanStack Router](https://tanstack.com/router/latest/docs/installation/with-vite), [react-i18next](https://react.i18next.com/latest/using-with-hooks), [SurveyJS React](https://surveyjs.io/form-library/documentation/get-started-react), [SurveyJS v3 tokens](https://surveyjs.io/documentation/design-tokens-css-customization), [Temporal](https://tc39.es/proposal-temporal/docs/zoneddatetime.html), and [Vite dependency scanning](https://vite.dev/config/dep-optimization-options).

Frontend Design, UI/UX Pro Max, Context7, and Playwright MCP were not exposed in this session. No substitute agent tools were installed. Ponytail and official Astryx guidance were used; Impeccable's launcher was not executable, so its polish reference was applied directly within the approved Neutral design.
