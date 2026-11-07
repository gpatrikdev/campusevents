import { Banner } from '@astryxdesign/core/Banner';
import { BreadcrumbItem, Breadcrumbs } from '@astryxdesign/core/Breadcrumbs';
import { Button } from '@astryxdesign/core/Button';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { useBlocker, useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DeleteIcon } from '../components/EventIcons';
import { AccessNotice, DataBoundary, EmptyNotice } from '../components/Feedback';
import { type ReviewTemplate, templateIssue } from '../domain/reviewForm';
import { isStaff } from '../domain/rules';
import { FormEditor } from '../reviews/FormEditor';

export function TemplateEditorPage({ templateId }: { templateId?: string }) {
  const { t } = useTranslation();
  const { user, data, dataState, run } = useApp();
  const navigate = useNavigate();
  const compact = useMediaQuery('(max-width: 42rem)');
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!isStaff(user)) return <AccessNotice />;
  const template = data.templates?.find((item) => item.id === templateId);
  const missing = templateId && !template && dataState === 'ready';
  const heading = t(templateId ? 'Edit template' : 'New template');
  return (
    <Layout
      height="auto"
      padding={compact ? 4 : 6}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={5}>
            <Breadcrumbs variant="supporting" label={t('Template navigation')}>
              <BreadcrumbItem href="/staff/templates">{t('Review templates')}</BreadcrumbItem>
            </Breadcrumbs>
            <HStack gap={4} vAlign="start" hAlign="between" wrap="wrap">
              <Heading level={1}>{heading}</Heading>
              {template && (
                <Button
                  label={t('Delete template')}
                  icon={<Icon icon={DeleteIcon} />}
                  variant="destructive"
                  isDisabled={dataState !== 'ready'}
                  onClick={() => setConfirmDelete(true)}
                />
              )}
            </HStack>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent isScrollable={false}>
          {missing ? (
            <EmptyNotice
              headingLevel={2}
              title={t('Template unavailable')}
              description={t('It may have been deleted.')}
            />
          ) : (
            <DataBoundary pending={!!templateId && !template}>
              <TemplateForm key={templateId ?? 'new'} initial={template} />
            </DataBoundary>
          )}
        </LayoutContent>
      }
      footer={
        <ConfirmDialog
          isOpen={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Delete this template?"
          description="Events that already copied it keep their review forms."
          label="Delete template"
          destructive
          onConfirm={async () => {
            if (!template) return;
            const result = await run({ type: 'deleteTemplate', templateId: template.id });
            // Unsaved edits go with the template, so leaving skips the discard prompt.
            if (result.ok) void navigate({ to: '/staff/templates', ignoreBlocker: true });
          }}
        />
      }
    />
  );
}

function TemplateForm({ initial }: { initial?: ReviewTemplate }) {
  const { t } = useTranslation();
  const { run } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState(initial?.name ?? '');
  const [questions, setQuestions] = useState(initial?.form.elements ?? []);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const saved = useRef(false);
  const errorNotice = useRef<HTMLDivElement>(null);
  const blocker = useBlocker({
    shouldBlockFn: () => dirty && !saved.current,
    withResolver: true,
    enableBeforeUnload: dirty,
  });
  function changed() {
    setDirty(true);
    setError('');
  }
  async function save() {
    if (saving) return;
    const template = { id: initial?.id ?? '', name, form: { elements: questions } };
    const issue = templateIssue(template);
    if (issue) {
      setError(issue);
      requestAnimationFrame(() => errorNotice.current?.scrollIntoView({ block: 'nearest' }));
      return;
    }
    setSaving(true);
    const result = await run({ type: 'saveTemplate', template });
    setSaving(false);
    if (result.ok) {
      saved.current = true;
      setDirty(false);
      void navigate({ to: '/staff/templates' });
    }
  }
  return (
    <VStack gap={6} maxWidth="50rem" width="100%">
      {error && (
        <VStack ref={errorNotice} className="scroll-below-nav" role="alert">
          <Banner status="error" title={t(error)} />
        </VStack>
      )}
      <TextInput
        label={t('Template name')}
        value={name}
        onChange={(value) => {
          setName(value);
          changed();
        }}
        isRequired
      />
      <FormEditor
        questions={questions}
        onChange={(next) => {
          setQuestions(next);
          changed();
        }}
      />
      <HStack gap={3} wrap="wrap">
        <Button
          label={t('Save template')}
          variant="primary"
          isLoading={saving}
          onClick={() => void save()}
        />
        <Button label={t('Cancel')} href="/staff/templates" />
      </HStack>
      <ConfirmDialog
        isOpen={blocker.status === 'blocked'}
        onOpenChange={(open) => {
          if (!open && blocker.status === 'blocked') blocker.reset();
        }}
        title="Discard unsaved changes?"
        description="Your unsaved template changes will be lost."
        label="Discard changes"
        destructive
        onConfirm={async () => {
          if (blocker.status === 'blocked') blocker.proceed();
        }}
      />
    </VStack>
  );
}
