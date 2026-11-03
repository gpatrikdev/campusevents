import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { HStack } from '@astryxdesign/core/HStack';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useTranslation } from 'react-i18next';

export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  descriptionValues,
  label,
  errorMessage,
  destructive = false,
  onConfirm,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  descriptionValues?: Record<string, string>;
  label: string;
  errorMessage?: string | null;
  destructive?: boolean;
  onConfirm: () => false | undefined;
}) {
  const { t } = useTranslation();
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width="30rem">
      <DialogHeader title={t(title)} onOpenChange={onOpenChange} />
      <VStack gap={6} padding={6}>
        <Text as="p">{t(description, descriptionValues)}</Text>
        {errorMessage && (
          <VStack role="alert">
            <Banner status="error" title={t(errorMessage)} />
          </VStack>
        )}
        <HStack gap={3} hAlign="end" wrap="wrap">
          <Button label={t('Cancel')} onClick={() => onOpenChange(false)} />
          <Button
            label={t(label)}
            variant={destructive ? 'destructive' : 'primary'}
            onClick={() => {
              if (onConfirm() !== false) onOpenChange(false);
            }}
          />
        </HStack>
      </VStack>
    </Dialog>
  );
}
