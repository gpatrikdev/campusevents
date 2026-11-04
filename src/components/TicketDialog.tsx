import { Button } from '@astryxdesign/core/Button';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';
import { Heading } from '@astryxdesign/core/Heading';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, read } from '../api/client';
import { useApp } from '../api/context';
import { formatDate } from '../domain/format';
import { EmptyNotice } from './Feedback';

export function TicketDialog({
  registrationId,
  onClose,
}: {
  registrationId: string | null;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { data, user, preview } = useApp();
  const registration = data.registrations.find(
    (item) => item.id === registrationId && item.userId === user?.id && item.active,
  );
  const ticketQuery = useQuery({
    queryKey: ['campus', 'ticket', user?.id, registrationId],
    queryFn: () =>
      read(
        api.registrations[':registrationId'].ticket.$get({
          param: { registrationId: registrationId ?? '' },
        }),
      ),
    enabled: !preview && !!registrationId && !!user,
    gcTime: 0,
    retry: false,
  });
  const ticket = preview
    ? registration?.ticket
    : ticketQuery.isSuccess
      ? ticketQuery.data.ticket
      : undefined;
  const event = preview
    ? data.events.find((item) => item.id === registration?.eventId && item.status === 'published')
    : ticketQuery.data?.event;
  const [qr, setQr] = useState<{ ticket: string; image: string }>();
  const [failed, setFailed] = useState(false);
  const mobile = useMediaQuery('(max-width: 48rem)');
  useEffect(() => {
    let active = true;
    setQr(undefined);
    setFailed(false);
    if (ticket)
      void QRCode.toDataURL(ticket, {
        width: 320,
        margin: 4,
        errorCorrectionLevel: 'M',
      })
        .then((value) => {
          if (active) setQr({ ticket, image: value });
        })
        .catch(() => {
          if (active) setFailed(true);
        });
    return () => {
      active = false;
    };
  }, [ticket]);
  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };
  return (
    <Dialog
      isOpen={registrationId !== null}
      onOpenChange={handleOpenChange}
      variant={mobile ? 'fullscreen' : 'standard'}
      width="30rem"
      maxHeight="90dvh"
    >
      <Layout
        padding={4}
        header={<DialogHeader title={t('QR ticket')} onOpenChange={handleOpenChange} />}
        content={
          <LayoutContent>
            <VStack gap={3} hAlign="center">
              {!preview && ticketQuery.isPending ? (
                <Text role="status">{t('Loading…')}</Text>
              ) : event && ticket && user ? (
                <>
                  <Heading level={3} justify="center" textWrap="balance">
                    {event.title}
                  </Heading>
                  <Text weight="semibold">{user.name}</Text>
                  <Text justify="center">
                    {formatDate(event.start, event.timezone, i18n.language)} · {event.timezone}
                  </Text>
                  {qr?.ticket === ticket && qr ? (
                    <img
                      src={qr.image}
                      alt={t('QR ticket for {{name}}', { name: user.name })}
                      className="ticket-qr"
                      width={320}
                      height={320}
                    />
                  ) : (
                    <Text role="status">
                      {t(failed ? 'QR code could not be generated.' : 'Loading…')}
                    </Text>
                  )}
                  <Text justify="center">{t('Present this ticket at the event entrance.')}</Text>
                </>
              ) : (
                <EmptyNotice
                  title={t('Ticket unavailable')}
                  description={t(
                    'This ticket is cancelled, invalidated, or the event was deleted.',
                  )}
                />
              )}
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider>
            <Button label={t('Close ticket')} onClick={onClose} width="100%" />
          </LayoutFooter>
        }
      />
    </Dialog>
  );
}
