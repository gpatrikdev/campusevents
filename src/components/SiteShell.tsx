import { AppShell } from '@astryxdesign/core/AppShell';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Grid } from '@astryxdesign/core/Grid';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { LinkProvider } from '@astryxdesign/core/Link';
import { Section } from '@astryxdesign/core/Section';
import { Selector } from '@astryxdesign/core/Selector';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import { TopNav, TopNavHeading, TopNavItem } from '@astryxdesign/core/TopNav';
import { VStack } from '@astryxdesign/core/VStack';
import { Outlet, Link as RouterLink, useRouterState } from '@tanstack/react-router';
import { type ComponentProps, forwardRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../domain/format';
import { isStaff } from '../domain/rules';
import { useMock } from '../mocks/hooks';
import { OutcomeNotice } from './Feedback';

const ClientLink = forwardRef<HTMLAnchorElement, ComponentProps<'a'>>(({ href, ...props }, ref) => (
  <RouterLink to={href ?? '/'} {...props} ref={ref} />
));

export function LanguagePicker() {
  const { t, i18n } = useTranslation();
  return (
    <Selector
      label={t('Language')}
      isLabelHidden
      variant="ghost"
      size="sm"
      value={i18n.language}
      options={[
        { value: 'en', label: 'English' },
        { value: 'hu', label: 'Magyar' },
      ]}
      onChange={(language) => {
        void i18n.changeLanguage(language);
      }}
    />
  );
}

function PreviewControls() {
  const { t, i18n } = useTranslation();
  const demo = useMock();
  return (
    <VStack gap={4} paddingBlock={4}>
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

// Top nav stays shallow. AppShell swaps it for mobile navigation below md.
export function SiteShell() {
  const { t, i18n } = useTranslation();
  const { user } = useMock();
  const [controlsOpen, setControlsOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = 'ltr';
  }, [i18n.language]);
  useEffect(() => {
    const title = pathname.startsWith('/staff')
      ? t('Staff dashboard')
      : pathname.startsWith('/admin')
        ? t('Organizers')
        : pathname.startsWith('/profile')
          ? t('Profile')
          : pathname.startsWith('/sign-in')
            ? t('Sign in')
            : pathname.startsWith('/complete-profile')
              ? t('Complete your profile')
              : pathname.startsWith('/review')
                ? t('Review this event')
                : t('Events');
    document.title = `${title} · Campus Events · ${t('UI preview · Sample data only')}`;
  }, [pathname, t]);

  return (
    <LinkProvider component={ClientLink}>
      <AppShell
        height="auto"
        variant="surface"
        contentPadding={6}
        mobileNav={{ breakpoint: 'md' }}
        topNav={
          <TopNav
            label={t('Main navigation')}
            heading={
              <TopNavHeading
                heading="Campus Events"
                subheading={t('University event service')}
                headingHref="/"
                logo={<Icon icon="calendar" size="lg" />}
              />
            }
            startContent={
              <>
                <TopNavItem
                  label={t('Events')}
                  href="/"
                  isSelected={pathname === '/' || pathname.startsWith('/events')}
                />
                {user && (
                  <TopNavItem
                    label={t('Profile')}
                    href="/profile"
                    isSelected={pathname.startsWith('/profile')}
                  />
                )}
                {isStaff(user) && (
                  <TopNavItem
                    label={t('Dashboard')}
                    href="/staff"
                    isSelected={pathname.startsWith('/staff')}
                  />
                )}
                {user?.role === 'admin' && (
                  <TopNavItem
                    label={t('Organizers')}
                    href="/admin"
                    isSelected={pathname.startsWith('/admin')}
                  />
                )}
              </>
            }
            endContent={
              <>
                <LanguagePicker />
                {!user && <Button label={t('Sign in')} href="/sign-in" size="sm" />}
              </>
            }
          />
        }
      >
        <VStack gap={10} className="page-frame">
          <Section variant="muted" padding={4}>
            <HStack gap={4} hAlign="between" wrap="wrap" vAlign="center">
              <VStack gap={1}>
                <Text type="label">{t('UI preview · Sample data only')}</Text>
                <Text type="supporting">
                  {t('No real sign-in, email, attendance, or certificate issuance.')}
                </Text>
              </VStack>
              <Button
                label={t(controlsOpen ? 'Close controls' : 'Preview controls')}
                size="sm"
                variant="ghost"
                onClick={() => setControlsOpen(!controlsOpen)}
                aria-expanded={controlsOpen}
                aria-controls="preview-controls"
              />
            </HStack>
            {controlsOpen && (
              <VStack id="preview-controls">
                <PreviewControls />
              </VStack>
            )}
          </Section>
          <OutcomeNotice />
          <Outlet />
          <VStack as="footer" gap={4} paddingBlock={6}>
            <Divider />
            <HStack gap={4} wrap="wrap" hAlign="between">
              <Text type="supporting">Campus Events · {t('University event service')}</Text>
              <Text type="supporting">{t('All times are shown in the event timezone.')}</Text>
            </HStack>
          </VStack>
        </VStack>
      </AppShell>
    </LinkProvider>
  );
}
