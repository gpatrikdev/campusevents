import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { HStack } from '@astryxdesign/core/HStack';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { useId } from 'react';
import { useTranslation } from 'react-i18next';

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  label,
  destructive = false,
  onConfirm,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  label: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  const { t } = useTranslation();
  const descriptionId = useId();
  return (
    <Dialog
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      purpose="form"
      width="30rem"
      aria-describedby={descriptionId}
    >
      <Layout
        padding={4}
        header={<DialogHeader title={t(title)} onOpenChange={onOpenChange} />}
        content={
          <LayoutContent>
            <Text as="p" id={descriptionId}>
              {t(description)}
            </Text>
          </LayoutContent>
        }
        footer={
          <LayoutFooter>
            <HStack gap={3} hAlign="end" wrap="wrap">
              <Button label={t('Cancel')} onClick={() => onOpenChange(false)} />
              <Button
                label={t(label)}
                variant={destructive ? 'destructive' : 'primary'}
                clickAction={async () => {
                  await onConfirm();
                  onOpenChange(false);
                }}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
