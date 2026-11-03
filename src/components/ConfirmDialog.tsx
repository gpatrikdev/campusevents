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
  onConfirm: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange} purpose="form" width="30rem">
      <DialogHeader title={t(title)} onOpenChange={onOpenChange} />
      <VStack gap={6} padding={6}>
        <Text as="p">{t(description)}</Text>
        <HStack gap={3} hAlign="end" wrap="wrap">
          <Button label={t('Cancel')} onClick={() => onOpenChange(false)} />
          <Button
            label={t(label)}
            variant={destructive ? 'destructive' : 'primary'}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          />
        </HStack>
      </VStack>
    </Dialog>
  );
}
