import { Banner } from '@astryxdesign/core/Banner';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';
import { Button } from '@astryxdesign/core/Button';
import { DateTimeInput, type ISODateTimeString } from '@astryxdesign/core/DateTimeInput';
import { FileInput } from '@astryxdesign/core/FileInput';
import { Grid } from '@astryxdesign/core/Grid';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import { Selector } from '@astryxdesign/core/Selector';
import { StackItem } from '@astryxdesign/core/Stack';
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
import { type CSSProperties, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { imageUrl } from '../api/images';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { imageAccept, richTextNodes } from '../components/EventImage';
import { AccessNotice, DataBoundary, UnavailableEvent } from '../components/Feedback';
import { InsertImageButton, InsertImageDialog } from '../components/InsertImageButton';
import type { Question } from '../domain/reviewForm';
import {
  eventInputIssue,
  HOUR,
  instantToLocal,
  isStaff,
  localToInstant,
  MAX_IMAGE_BYTES,
} from '../domain/rules';
import type { CampusEvent } from '../domain/types';
import { FormEditor } from '../reviews/FormEditor';

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
  const { now, run, upload } = useApp();
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
  const [banner, setBanner] = useState(initial?.banner ?? null);
  const [questions, setQuestions] = useState<Question[]>(initial?.form?.elements ?? []);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerError, setBannerError] = useState('');
  const [uploading, setUploading] = useState(false);
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
  // FileInput shows its clear button only while it holds a file. A banner
  // saved earlier has no File here, so a stand-in carries its name.
  const bannerValue = useMemo(
    () => (banner ? (bannerFile ?? new File([], t('Current banner'))) : null),
    [banner, bannerFile, t],
  );
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

  // FileInput calls this with null only from its clear button. A rejected
  // file reaches onChange alone, so it leaves the current banner in place.
  async function changeBanner(file: File | File[] | null) {
    if (file === null) {
      setBanner(null);
      setBannerFile(null);
      changed();
      return;
    }
    if (!(file instanceof File)) return;
    setUploading(true);
    const result = await upload(file);
    setUploading(false);
    if (result.ok && result.id) {
      setBanner(result.id);
      setBannerFile(file);
      changed();
    } else setBannerError(result.message);
  }

  async function save() {
    if (locked || saving || uploading) return;
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
        banner,
        form: questions.length ? { elements: questions } : null,
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
              <FileInput
                label={t('Banner image')}
                mode="dropzone"
                controlClassName={banner ? 'banner-dropzone dropzone-preview' : 'banner-dropzone'}
                controlStyle={
                  banner
                    ? ({ '--dropzone-preview': `url("${imageUrl(banner)}")` } as CSSProperties)
                    : undefined
                }
                accept={imageAccept}
                maxSize={MAX_IMAGE_BYTES}
                description={t(
                  'Shown across the top of the event page. JPEG, PNG, WebP or GIF, up to 5 MB.',
                )}
                value={bannerValue}
                onChange={() => setBannerError('')}
                changeAction={changeBanner}
                status={bannerError ? { type: 'error', message: t(bannerError) } : undefined}
                statusVariant="detached"
                isOptional
              />
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
            nodes={richTextNodes}
            toolbar={<RichTextEditorToolbar endContent={<InsertImageButton />} />}
            plugins={<InsertImageDialog />}
            minHeight="16rem"
            isRequired
          />
          <ReviewFormFields
            questions={questions}
            onChange={(next) => {
              setQuestions(next);
              changed();
            }}
          />
          <HStack gap={3} wrap="wrap">
            <Button
              label={t('Save draft')}
              type="submit"
              form="event-draft-form"
              isLoading={saving}
              isDisabled={uploading}
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

function ReviewFormFields({
  questions,
  onChange,
}: {
  questions: Question[];
  onChange: (questions: Question[]) => void;
}) {
  const { t } = useTranslation();
  const templates = useApp().data.templates ?? [];
  return (
    <VStack gap={4}>
      <VStack gap={2}>
        <Heading level={2}>{t('Review form')}</Heading>
        <Text color="secondary">
          {questions.length
            ? t(
                'Attendees who checked in answer these questions after the event. Publishing locks the form.',
              )
            : t('Without questions, this event has no review step.')}
        </Text>
      </VStack>
      {(templates.length > 0 || questions.length > 0) && (
        <HStack gap={3} vAlign="end">
          {templates.length > 0 && (
            <StackItem size="fill">
              <Selector
                label={t('Copy a template')}
                placeholder={t('Choose a template')}
                value=""
                options={templates.map(({ id, name }) => ({ value: id, label: name }))}
                description={questions.length ? t('Replaces the current questions.') : undefined}
                onChange={(id) => {
                  const template = templates.find((item) => item.id === id);
                  if (template) onChange(structuredClone(template.form.elements));
                }}
                width="100%"
              />
            </StackItem>
          )}
          {questions.length > 0 && <Button label={t('Remove form')} onClick={() => onChange([])} />}
        </HStack>
      )}
      <FormEditor questions={questions} onChange={onChange} />
    </VStack>
  );
}
