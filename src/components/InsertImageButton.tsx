import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { FileInput } from '@astryxdesign/core/FileInput';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { IconButton } from '@astryxdesign/core/IconButton';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { Stack } from '@astryxdesign/core/Stack';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $insertNodeToNearestRoot } from '@lexical/utils';
import {
  $getRoot,
  $getSelection,
  $setSelection,
  type BaseSelection,
  COMMAND_PRIORITY_EDITOR,
  createCommand,
} from 'lexical';
import { type CSSProperties, type FormEvent, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { MAX_IMAGE_BYTES } from '../domain/rules';
import { ImageIcon } from './EventIcons';
import { $createImageNode, imageAccept } from './EventImage';

// The editor's image upload. It lives apart from the image node so event pages
// don't load it. The button sits in the toolbar and the dialog in the editor's
// plugins. The toolbar takes every control inside it out of the Tab order, so
// arrow keys can move between its buttons, and a dialog there couldn't be
// reached with Tab.
const OPEN_IMAGE_DIALOG = createCommand<void>('OPEN_IMAGE_DIALOG');

export function InsertImageButton() {
  const { t } = useTranslation();
  const [editor] = useLexicalComposerContext();
  return (
    <IconButton
      label={t('Insert image')}
      icon={<Icon icon={ImageIcon} />}
      variant="ghost"
      aria-haspopup="dialog"
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => editor.dispatchCommand(OPEN_IMAGE_DIALOG, undefined)}
    />
  );
}

export function InsertImageDialog() {
  const { t } = useTranslation();
  const { upload } = useApp();
  const [editor] = useLexicalComposerContext();
  const selection = useRef<BaseSelection | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [isOpen, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  // The chosen image shows in the drop zone from the browser's copy. It is
  // only uploaded on insert, so a cancelled dialog leaves nothing in storage.
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  // Astryx focuses a dialog's title when it opens. The editor's Link dialog
  // focuses its field instead, so this one focuses the drop zone to match.
  // FileInput's ref reaches only its hidden file input, so the drop zone's
  // button is looked up beside it. This runs after the dialog has opened.
  useEffect(() => {
    if (isOpen) fileInput.current?.closest('.astryx-file-input')?.querySelector('button')?.focus();
  }, [isOpen]);

  useEffect(
    () =>
      editor.registerCommand(
        OPEN_IMAGE_DIALOG,
        () => {
          // The dialog takes focus, so this keeps the caret position for the insert.
          selection.current = $getSelection()?.clone() ?? null;
          setFile(null);
          setAlt('');
          setError('');
          setOpen(true);
          return true;
        },
        COMMAND_PRIORITY_EDITOR,
      ),
    [editor],
  );

  async function insert(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!file) {
      setError('Choose an image.');
      return;
    }
    setBusy(true);
    const result = await upload(file);
    setBusy(false);
    const id = result.ok ? result.id : undefined;
    if (!id) {
      setError(result.message);
      return;
    }
    // The caret goes back first, in an update of its own. Undo history starts
    // from the editor's first change, so an image inserted before anyone
    // clicked into the text could not be undone otherwise.
    editor.update(
      () => {
        if (selection.current) $setSelection(selection.current.clone());
        else $getRoot().selectEnd();
      },
      { discrete: true },
    );
    editor.update(() => {
      $insertNodeToNearestRoot($createImageNode(id, alt.trim()));
    });
    setOpen(false);
    requestAnimationFrame(() => editor.focus());
  }

  return (
    <Dialog isOpen={isOpen} onOpenChange={setOpen} purpose="form" width="30rem">
      <Stack as="form" onSubmit={insert}>
        <Layout
          padding={4}
          header={<DialogHeader title={t('Insert image')} onOpenChange={setOpen} />}
          content={
            <LayoutContent>
              <VStack gap={5}>
                <FileInput
                  ref={fileInput}
                  label={t('Image')}
                  mode="dropzone"
                  controlClassName={preview ? 'image-dropzone dropzone-preview' : 'image-dropzone'}
                  controlStyle={
                    preview
                      ? ({ '--dropzone-preview': `url("${preview}")` } as CSSProperties)
                      : undefined
                  }
                  accept={imageAccept}
                  maxSize={MAX_IMAGE_BYTES}
                  description={t('JPEG, PNG, WebP or GIF, up to 5 MB.')}
                  value={file}
                  onChange={(value) => {
                    setFile(value instanceof File ? value : null);
                    setError('');
                  }}
                  status={error ? { type: 'error', message: t(error) } : undefined}
                  statusVariant="detached"
                  width="100%"
                  isRequired
                />
                <TextInput
                  label={t('Alternative text')}
                  description={t(
                    'Describe the image for people who can’t see it. Leave it empty if the image is only decorative.',
                  )}
                  value={alt}
                  onChange={setAlt}
                  width="100%"
                  isOptional
                />
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter>
              <HStack gap={3} hAlign="end" wrap="wrap">
                <Button label={t('Cancel')} onClick={() => setOpen(false)} />
                <Button
                  label={t('Insert image')}
                  variant="primary"
                  type="submit"
                  isLoading={busy}
                />
              </HStack>
            </LayoutFooter>
          }
        />
      </Stack>
    </Dialog>
  );
}
