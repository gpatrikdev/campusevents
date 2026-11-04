import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { DateTimeInput, type ISODateTimeString } from '@astryxdesign/core/DateTimeInput';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
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
  const { user, data } = useApp();
  if (!isStaff(user)) return <AccessNotice />;
  const event = data.events.find((item) => item.id === eventId);
  if (eventId && !event) return <UnavailableEvent />;
  return (
    <DataBoundary>
      <DraftEditor key={eventId ?? 'new'} initial={event} />
    </DataBoundary>
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
  function changed() {
    setDirty(true);
    setError('');
  }

  async function save() {
    if (locked || saving) return;
    const text = editor.current?.getMarkdown() ?? '';
    if (!text.trim()) {
      setError('Add an event description.');
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
      setError(
        'This local time is invalid or ambiguous in the selected timezone. Choose another time.',
      );
      return;
    }
    const issue = eventInputIssue(event);
    if (issue) {
      setError(issue);
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
      <VStack gap={3}>
        <Heading level={1}>{t(initial ? 'Edit draft' : 'Create an event')}</Heading>
        <Text color="secondary">
          {t('Save a draft, preview the public page, then publish when ready.')}
        </Text>
      </VStack>
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
                <VStack role="alert">
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
              <Grid columns={{ minWidth: 280, max: 2 }} gap={6}>
                <DateTimeInput
                  label={t('Starts at')}
                  value={start ? (start as ISODateTimeString) : undefined}
                  onChange={(value) => {
                    setStart(value ?? '');
                    changed();
                  }}
                  isRequired
                />
                <DateTimeInput
                  label={t('Ends at')}
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
