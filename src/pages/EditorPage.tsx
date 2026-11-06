import { Banner } from '@astryxdesign/core/Banner';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';
import { Button } from '@astryxdesign/core/Button';
import { DateTimeInput, type ISODateTimeString } from '@astryxdesign/core/DateTimeInput';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { type SearchSource, Typeahead } from '@astryxdesign/core/Typeahead';
import { VStack } from '@astryxdesign/core/VStack';
import {
  RichTextEditor,
  type RichTextEditorRef,
  RichTextEditorToolbar,
} from '@astryxdesign/richtext';
import { markdownToEditorStateJSON } from '@astryxdesign/richtext/markdown';
import { useBlocker, useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AccessNotice, DataBoundary, UnavailableEvent } from '../components/Feedback';
import { eventInputIssue, HOUR, instantToLocal, isStaff, localToInstant } from '../domain/rules';
import type { CampusEvent } from '../domain/types';

const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const timezones = [
  ...new Set([browserTimezone, 'Europe/Budapest', 'UTC', ...Intl.supportedValuesOf('timeZone')]),
]
  .sort()
  .map((zone) => ({ id: zone, label: zone }));
const timezoneSource: SearchSource = {
  search: (query) =>
    timezones.filter((zone) => zone.label.toLowerCase().includes(query.toLowerCase())),
  bootstrap: () =>
    timezones.filter((zone) => [browserTimezone, 'Europe/Budapest', 'UTC'].includes(zone.id)),
};

export function EditorPage({ eventId }: { eventId?: string }) {
  const { t } = useTranslation();
  const { user, data, dataState } = useApp();
  const compact = useMediaQuery('(max-width: 42rem)');
  if (!isStaff(user)) return <AccessNotice />;
  const event = data.events.find((item) => item.id === eventId);
  // Dashboard pages render while their data loads, so an event that hasn't
  // arrived yet is only reported missing once loading is over.
  if (eventId && !event && dataState === 'ready') return <UnavailableEvent />;
  const heading = t(eventId ? 'Edit draft' : 'Create an event');
  return (
    <Layout
      height="auto"
      padding={compact ? 4 : 6}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={5}>
            <Breadcrumbs variant="supporting" label={t('Event navigation')}>
              <BreadcrumbItem href="/staff">{t('Events')}</BreadcrumbItem>
              {event && (
                <BreadcrumbItem href={`/staff/events/${event.id}`}>
                  <VStack maxWidth={compact ? '12rem' : '32rem'}>
                    <Text type="inherit" maxLines={1}>
                      {event.title}
                    </Text>
                  </VStack>
                </BreadcrumbItem>
              )}
              <BreadcrumbItem isCurrent>{heading}</BreadcrumbItem>
            </Breadcrumbs>
            <VStack gap={3}>
              <Heading level={1}>{heading}</Heading>
              <Text color="secondary">
                {t('Save a draft, preview the public page, then publish when ready.')}
              </Text>
            </VStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent isScrollable={false}>
          {/* The form reads its starting values once, so it mounts after loading. */}
          <DataBoundary headingLevel={2}>
            <DraftEditor key={eventId ?? 'new'} initial={event} />
          </DataBoundary>
        </LayoutContent>
      }
    />
  );
}

function DraftEditor({ initial }: { initial?: CampusEvent }) {
  const { t } = useTranslation();
  const { now, run } = useApp();
  const navigate = useNavigate();
  const initialZone = initial?.timezone ?? browserTimezone;
  const [title, setTitle] = useState(initial?.title ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [timezone, setTimezone] = useState(initialZone);
  const [start, setStart] = useState(
    instantToLocal(initial?.start ?? new Date(now + 7 * 24 * HOUR).toISOString(), initialZone),
  );
  const [end, setEnd] = useState(
    instantToLocal(
      initial?.end ?? new Date(now + 7 * 24 * HOUR + 2 * HOUR).toISOString(),
      initialZone,
    ),
  );
  const [content, setContent] = useState(initial?.content ?? markdownToEditorStateJSON(''));
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const saved = useRef(false);
  const editor = useRef<RichTextEditorRef>(null);
  const blocker = useBlocker({
    shouldBlockFn: () => dirty && !saved.current,
    withResolver: true,
    enableBeforeUnload: dirty,
  });
  const locked = initial?.status === 'published';
  const errorNotice = useRef<HTMLDivElement>(null);
  function changed() {
    setDirty(true);
    setError('');
  }
  function fail(message: string) {
    setError(message);
    // Save draft sits below a form that can be taller than the screen, so the
    // message at the top of the form is brought into view, every time.
    requestAnimationFrame(() => errorNotice.current?.scrollIntoView({ block: 'nearest' }));
  }

  async function save() {
    if (locked || saving) return;
    const text = editor.current?.getMarkdown() ?? '';
    if (!text.trim()) {
      fail('Add an event description.');
      return;
    }
    let event: CampusEvent;
    try {
      event = {
        id: initial?.id ?? '',
        status: 'draft',
        title,
        location,
        timezone,
        start: localToInstant(start, timezone),
        end: localToInstant(end, timezone),
        content,
      };
    } catch {
      fail(
        'This local time is invalid or ambiguous in the selected timezone. Choose another time.',
      );
      return;
    }
    const issue = eventInputIssue(event);
    if (issue) {
      fail(issue);
      return;
    }
    setSaving(true);
    const result = await run({ type: 'save', event });
    setSaving(false);
    if (result.ok && result.id) {
      saved.current = true;
      setDirty(false);
      void navigate({ to: '/staff/events/$eventId', params: { eventId: result.id } });
    }
  }

  return (
    <VStack gap={6} maxWidth={800} width="100%">
      {locked ? (
        <Banner
          status="info"
          title={t('Published details are locked. Unpublish before the start to edit.')}
        />
      ) : (
        <>
          <form
            id="event-draft-form"
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              await save();
            }}
          >
            <VStack gap={6}>
              {error && (
                <VStack ref={errorNotice} className="scroll-below-nav" role="alert">
                  <Banner status="error" title={t(error)} />
                </VStack>
              )}
              <TextInput
                label={t('Event title')}
                value={title}
                onChange={(value) => {
                  setTitle(value);
                  changed();
                }}
                isRequired
              />
              <TextInput
                label={t('Location')}
                value={location}
                onChange={(value) => {
                  setLocation(value);
                  changed();
                }}
                isRequired
              />
              <Typeahead
                label={t('Event timezone')}
                value={timezones.find((zone) => zone.id === timezone) ?? null}
                searchSource={timezoneSource}
                hasEntriesOnFocus
                debounceMs={0}
                hasClear={false}
                onChange={(value) => {
                  if (value) setTimezone(value.id);
                  changed();
                }}
                description={t(
                  'Dates and times are entered in this timezone. Ambiguous or nonexistent daylight-saving times are rejected.',
                )}
                isRequired
              />
              {/* British and Hungarian calendars start the week on Monday. Astryx
                  starts it on Sunday whatever the locale. */}
              <Grid columns={{ minWidth: 280, max: 2 }} gap={6}>
                <DateTimeInput
                  label={t('Starts at')}
                  weekStartsOn="mon"
                  value={start ? (start as ISODateTimeString) : undefined}
                  onChange={(value) => {
                    setStart(value ?? '');
                    changed();
                  }}
                  isRequired
                />
                <DateTimeInput
                  label={t('Ends at')}
                  weekStartsOn="mon"
                  value={end ? (end as ISODateTimeString) : undefined}
                  onChange={(value) => {
                    setEnd(value ?? '');
                    changed();
                  }}
                  isRequired
                />
              </Grid>
            </VStack>
          </form>
          {/* RichText's link dialog owns a form, so the editor stays outside this form. */}
          <RichTextEditor
            ref={editor}
            label={t('Event description')}
            description={t(
              'Use the formatting toolbar or Markdown shortcuts. Content stays in the language you write.',
            )}
            defaultValue={initial?.content}
            onChange={(state) => {
              const value = JSON.stringify(state.toJSON());
              setContent(value);
              if (value !== initial?.content && initial?.content) changed();
              else if (!initial) changed();
            }}
            toolbar={<RichTextEditorToolbar />}
            minHeight="16rem"
            isRequired
          />
          <HStack gap={3} wrap="wrap">
            <Button
              label={t('Save draft')}
              type="submit"
              form="event-draft-form"
              isLoading={saving}
              variant="primary"
            />
            <Button label={t('Cancel')} href={initial ? `/staff/events/${initial.id}` : '/staff'} />
          </HStack>
        </>
      )}
      <ConfirmDialog
        isOpen={blocker.status === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.status === 'blocked') blocker.reset();
        }}
        title="Discard unsaved changes?"
        description="Your unsaved draft changes will be lost."
        label="Discard changes"
        destructive
        onConfirm={async () => {
          if (blocker.status === 'blocked') blocker.proceed();
        }}
      />
    </VStack>
  );
}
