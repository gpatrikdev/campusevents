import { Button } from '@astryxdesign/core/Button';
import { Grid } from '@astryxdesign/core/Grid';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { Popover } from '@astryxdesign/core/Popover';
import { Selector } from '@astryxdesign/core/Selector';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../domain/format';
import { useMock } from './hooks';

export function PreviewControls() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <VStack className="preview-controls-launcher">
      <Popover
        label={t('Preview controls')}
        placement="above"
        alignment="end"
        width="42rem"
        padding={4}
        isOpen={open}
        onOpenChange={setOpen}
        hasCloseButton={false}
        content={<PreviewSettings onClose={() => setOpen(false)} />}
      >
        <Button
          label={t('Preview controls')}
          size="sm"
          elevation="low"
          icon={<Icon icon="wrench" />}
        />
      </Popover>
    </VStack>
  );
}

function PreviewSettings({ onClose }: { onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const demo = useMock();
  return (
    <VStack gap={4}>
      <HStack gap={3} hAlign="between" vAlign="start">
        <VStack gap={1}>
          <Text type="label">{t('UI preview · Sample data only')}</Text>
          <Text type="supporting">
            {t('No real sign-in, email, attendance, or certificate issuance.')}
          </Text>
        </VStack>
        <Button
          label={t('Close controls')}
          size="sm"
          variant="ghost"
          isIconOnly
          icon={<Icon icon="close" />}
          onClick={onClose}
        />
      </HStack>
      <Grid columns={{ minWidth: 200, max: 3 }} gap={4}>
        <Selector
          label={t('Demo identity')}
          value={demo.identity}
          options={[
            { value: 'visitor', label: t('Visitor') },
            { value: 'new', label: t('First login') },
            ...[
              ['attendee', 'Eszter'],
              ['organizer', 'Anna'],
              ['admin', 'Balázs'],
            ].map(([value, name]) => {
              const role = demo.data.users.find((account) => account.id === value)?.role;
              return {
                value,
                label: `${t(role === 'admin' ? 'Admin' : role === 'organizer' ? 'Organizer' : 'Attendee')} · ${name}`,
              };
            }),
          ]}
          onChange={(value) => {
            demo.setIdentity(value);
            demo.setOutcome(null);
          }}
        />
        <Selector
          label={t('Demo clock')}
          value={demo.clock}
          options={[
            { value: 'reference', label: t('Reference time · 3 Nov') },
            { value: 'cutoff', label: t('At registration cutoff') },
            { value: 'checkin', label: t('At check-in opening') },
            { value: 'start', label: t('At event start') },
            { value: 'end', label: t('At event end') },
            { value: 'reviewClosed', label: t('At review cutoff') },
          ]}
          onChange={(value) => {
            if (value in { reference: 1, cutoff: 1, checkin: 1, start: 1, end: 1, reviewClosed: 1 })
              demo.setClock(value as typeof demo.clock);
            demo.setOutcome(null);
          }}
        />
        <Selector
          label={t('Data state')}
          value={demo.dataState}
          options={['ready', 'loading', 'empty', 'error'].map((value) => ({
            value,
            label: t(value.charAt(0).toUpperCase() + value.slice(1)),
          }))}
          onChange={(value) => demo.setDataState(value as typeof demo.dataState)}
        />
      </Grid>
      <Text type="supporting">{t('Time scenarios refer to The future of responsible AI.')}</Text>
      <HStack gap={4} hAlign="between" wrap="wrap" vAlign="center">
        <Switch
          label={t('Simulate action failures')}
          value={demo.failActions}
          onChange={demo.setFailActions}
        />
        <Button label={t('Reset sample data')} size="sm" onClick={demo.reset} />
      </HStack>
      <Text type="supporting">
        {formatDate(demo.now, 'Europe/Budapest', i18n.language)} · Europe/Budapest.{' '}
        {t('Changes last until the page is reloaded.')}
      </Text>
    </VStack>
  );
}
