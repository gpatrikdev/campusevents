import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Heading } from '@astryxdesign/core/Heading';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../domain/format';
import { useMock } from '../mocks/hooks';

export function TicketDialog({
  registrationId,
  onClose,
}: {
  registrationId: string | null;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { data, user } = useMock();
  const registration = data.registrations.find(
    (item) => item.id === registrationId && item.userId === user?.id && item.active,
  );
  const event = data.events.find(
    (item) => item.id === registration?.eventId && item.status === 'published',
  );
  const [qr, setQr] = useState('');
  const [failed, setFailed] = useState(false);
  const mobile = useMediaQuery('(max-width: 48rem)');
  useEffect(() => {
    let active = true;
    setQr('');
    setFailed(false);
    if (registration?.ticket)
      void QRCode.toDataURL(registration.ticket, {
        width: 320,
        margin: 4,
        errorCorrectionLevel: 'M',
      })
        .then((value) => {
          if (active) setQr(value);
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    return () => {
      active = false;
    };
  }, [registration?.ticket]);
  return (
    <Dialog
      isOpen={registrationId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      variant={mobile ? 'fullscreen' : 'standard'}
      width="30rem"
    >
      <DialogHeader
        title={t('Demo QR ticket')}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      />
      <VStack gap={6} padding={6} hAlign="center">
        {event && registration && user ? (
          <>
            <Heading level={3}>{event.title}</Heading>
            <Text weight="semibold">{user.name}</Text>
            <Text justify="center">
              {formatDate(event.start, event.timezone, i18n.language)} · {event.timezone}
            </Text>
            {qr ? (
              <img
                src={qr}
                alt={t('Demo QR ticket for {{name}}', { name: user.name })}
                className="ticket-qr"
                width={320}
                height={320}
              />
            ) : (
              <Text role="status">
                {t(failed ? 'QR code could not be generated.' : 'Loading sample data…')}
              </Text>
            )}
            <Text justify="center">{t('Present this ticket at the event entrance.')}</Text>
            <Text type="supporting" justify="center">
              {t('This sample QR code is valid only inside this local preview.')}
            </Text>
          </>
        ) : (
          <EmptyState
            title={t('Ticket unavailable')}
            description={t('This ticket is cancelled, invalidated, or the event was deleted.')}
          />
        )}
        <Button label={t('Close ticket')} onClick={onClose} width="100%" />
      </VStack>
    </Dialog>
  );
}
