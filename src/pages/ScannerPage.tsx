import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import wasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import { useApp } from '../api/context';
import { QrCodeIcon } from '../components/EventIcons';
import { AccessNotice, DataBoundary, UnavailableEvent } from '../components/Feedback';
import { ScannerLayout } from '../components/ScannerLayout';
import { formatDate } from '../domain/format';
import { HOUR, hasEnded, instant, isStaff } from '../domain/rules';
import type { Outcome } from '../domain/types';

export function ScannerPage({ eventId }: { eventId: string }) {
  const { preview } = useApp();
  return preview ? (
    <preview.Scanner eventId={eventId} />
  ) : (
    <CameraScanner key={eventId} eventId={eventId} />
  );
}

function CameraScanner({ eventId }: { eventId: string }) {
  const { t, i18n } = useTranslation();
  const { data, user, now, run, setOutcome } = useApp();
  const event = data.events.find((item) => item.id === eventId);
  const [active, setActive] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<Outcome | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const allowed =
    !!event &&
    isStaff(user) &&
    event.status === 'published' &&
    now >= instant(event.start) - HOUR &&
    !hasEnded(event, now);
  const onRead = useEffectEvent(async (ticket: string) => {
    setActive(false);
    setScanning(true);
    const outcome = await run({ type: 'scan', eventId, ticket });
    setOutcome(null);
    setResult(outcome);
    setScanning(false);
  });
  useEffect(() => {
    if (!active || !allowed || !video.current) return;
    const feed = video.current;
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function start() {
      const { BarcodeDetector, prepareZXingModule } = await import('barcode-detector/ponyfill');
      prepareZXingModule({
        overrides: {
          locateFile: (path: string, prefix: string) =>
            path.endsWith('.wasm') ? wasmUrl : prefix + path,
        },
      });
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      if (stopped) return;
      stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
      if (stopped) {
        for (const track of stream.getTracks()) track.stop();
        return;
      }
      feed.srcObject = stream;
      await feed.play();
      if (stopped) return;
      setCameraReady(true);
      await scan();
      async function scan() {
        if (stopped) return;
        const codes = feed.readyState >= 2 ? await detector.detect(feed) : [];
        if (stopped) return;
        if (codes[0]?.rawValue) {
          await onRead(codes[0].rawValue);
        } else {
          timer = setTimeout(() => {
            void scan().catch(fail);
          }, 200);
        }
      }
    }
    function fail() {
      if (stopped) return;
      setActive(false);
      setResult({
        ok: false,
        message: 'The camera or QR scanner could not start. Check camera access and try again.',
      });
    }
    void start().catch(fail);
    return () => {
      stopped = true;
      clearTimeout(timer);
      for (const track of stream?.getTracks() ?? []) track.stop();
      feed.srcObject = null;
    };
  }, [active, allowed]);

  if (!isStaff(user)) return <AccessNotice />;
  if (!event) return <UnavailableEvent />;
  const cameraActive = active && allowed;
  return (
    <DataBoundary>
      <ScannerLayout
        event={event}
        description={t('Point the camera at the QR code on the attendee’s ticket.')}
        viewport={
          cameraActive ? (
            <>
              <video
                ref={video}
                muted
                playsInline
                aria-label={t('Ticket camera')}
                className="ticket-camera"
              />
              {!cameraReady && <Text role="status">{t('Starting camera…')}</Text>}
            </>
          ) : (
            <>
              <Icon icon={QrCodeIcon} size="lg" />
              <Text>{t('No camera is active')}</Text>
            </>
          )
        }
        controls={
          allowed && (
            <HStack>
              <Button
                label={t(
                  cameraActive ? 'Stop camera' : result ? 'Scan another ticket' : 'Start camera',
                )}
                variant="primary"
                icon={<Icon icon={cameraActive ? 'stop' : QrCodeIcon} />}
                isLoading={scanning}
                onClick={() => {
                  setActive(!cameraActive);
                  setCameraReady(false);
                  setResult(null);
                }}
              />
            </HStack>
          )
        }
        availability={
          !allowed && (
            <Text>
              {t(
                event.status === 'draft'
                  ? 'Publish the event before scanning tickets.'
                  : hasEnded(event, now)
                    ? 'Check-in has closed.'
                    : 'Check-in opens one hour before the start.',
              )}
            </Text>
          )
        }
        feedback={
          result && (
            <VStack role="status">
              <Banner
                status={result.ok ? 'success' : 'warning'}
                title={t(result.message)}
                description={
                  result.checkedInAt
                    ? formatDate(result.checkedInAt, event.timezone, i18n.language)
                    : undefined
                }
              />
            </VStack>
          )
        }
      />
    </DataBoundary>
  );
}
