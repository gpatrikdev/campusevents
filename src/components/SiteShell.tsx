import { AppShell, useAppShellMobile } from '@astryxdesign/core/AppShell';
import { Button } from '@astryxdesign/core/Button';
import { Grid } from '@astryxdesign/core/Grid';
import { HStack } from '@astryxdesign/core/HStack';
import { Icon } from '@astryxdesign/core/Icon';
import { LinkProvider } from '@astryxdesign/core/Link';
import { MobileNav } from '@astryxdesign/core/MobileNav';
import { Popover } from '@astryxdesign/core/Popover';
import { Selector } from '@astryxdesign/core/Selector';
import { SideNavItem } from '@astryxdesign/core/SideNav';
import { Switch } from '@astryxdesign/core/Switch';
import { Text } from '@astryxdesign/core/Text';
import { TopNav, TopNavItem } from '@astryxdesign/core/TopNav';
import { VStack } from '@astryxdesign/core/VStack';
import { Outlet, Link as RouterLink, useRouter, useRouterState } from '@tanstack/react-router';
import { type ComponentProps, forwardRef, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDate } from '../domain/format';
import { isStaff } from '../domain/rules';
import { useMock } from '../mocks/hooks';
import { OutcomeNotice } from './Feedback';

const ClientLink = forwardRef<HTMLAnchorElement, ComponentProps<'a'>>(({ href, ...props }, ref) => (
  <RouterLink to={href ?? '/'} {...props} ref={ref} />
));

const isPublicEventPage = (pathname: string) => pathname === '/' || pathname.startsWith('/events/');

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

function DesktopAccountLinks({
  isSignedIn,
  isProfileSelected,
  onSignOut,
}: {
  isSignedIn: boolean;
  isProfileSelected: boolean;
  onSignOut: () => void;
}) {
  const { t } = useTranslation();
  const { isMobile } = useAppShellMobile();
  if (isMobile) return null;
  if (!isSignedIn) return <Button label={t('Sign in')} href="/sign-in" size="sm" />;
  return (
    <>
      <TopNavItem label={t('Profile')} href="/profile" isSelected={isProfileSelected} />
      <Button label={t('Sign out')} variant="ghost" size="sm" onClick={onSignOut} />
    </>
  );
}

function DrawerItem({ onClick, ...props }: ComponentProps<typeof SideNavItem>) {
  const { closeMobileNav } = useAppShellMobile();
  return (
    <SideNavItem
      {...props}
      onClick={(event) => {
        onClick?.(event);
        closeMobileNav();
      }}
    />
  );
}

export function SiteShell() {
  const { t, i18n } = useTranslation();
  const { user, data, setIdentity, setOutcome } = useMock();
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const publicPage = isPublicEventPage(pathname);
  const authPage = /^\/(sign-in|complete-profile)\/?$/.test(pathname);
  const notFound = useRouterState({
    select: (state) => state.matches.some((match) => match._notFound),
  });
  // Sign-in, profile completion and unknown URLs render without navigation.
  const bare = authPage || notFound;
  const pageFrame = useRef<HTMLDivElement>(null);
  const eventTitle =
    publicPage &&
    data.events.find((event) => event.status === 'published' && pathname === `/events/${event.id}`)
      ?.title;
  useEffect(() => {
    document.documentElement.lang = i18n.language;
    document.documentElement.dir = 'ltr';
  }, [i18n.language]);
  useEffect(() => {
    const title = notFound
      ? t('Page not found')
      : pathname.startsWith('/staff')
        ? t('Staff dashboard')
        : pathname.startsWith('/admin')
          ? t('Organizers')
          : pathname.startsWith('/registrations')
            ? t('Registrations')
            : pathname.startsWith('/profile')
              ? t('Profile')
              : pathname.startsWith('/sign-in')
                ? t('Sign in')
                : pathname.startsWith('/complete-profile')
                  ? t('Complete your profile')
                  : pathname.startsWith('/review')
                    ? t('Review this event')
                    : t('Events');
    document.title = `${eventTitle || title} · ${t('UI preview · Sample data only')}`;
  }, [eventTitle, notFound, pathname, t]);
  useEffect(
    () =>
      router.subscribe('onRendered', ({ fromLocation, toLocation, pathChanged }) => {
        if (
          !pathChanged ||
          !fromLocation ||
          !isPublicEventPage(fromLocation.pathname) ||
          !isPublicEventPage(toLocation.pathname)
        )
          return;
        const heading = pageFrame.current?.querySelector('h1');
        if (heading) {
          heading.tabIndex = -1;
          heading.focus({ preventScroll: true });
        }
      }),
    [router],
  );

  const navItems = [{ label: t('Events'), href: '/', isSelected: publicPage }];
  if (user)
    navItems.push({
      label: t('Registrations'),
      href: '/registrations',
      isSelected: pathname.startsWith('/registrations'),
    });
  if (isStaff(user))
    navItems.push({
      label: t('Dashboard'),
      href: '/staff',
      isSelected: pathname.startsWith('/staff'),
    });
  if (user?.role === 'admin')
    navItems.push({
      label: t('Organizers'),
      href: '/admin',
      isSelected: pathname.startsWith('/admin'),
    });

  function signOut() {
    setIdentity('visitor');
    setOutcome(null);
  }

  return (
    <LinkProvider component={ClientLink}>
      <AppShell
        height="auto"
        variant="surface"
        contentPadding={bare ? 0 : 6}
        mobileNav={
          bare
            ? false
            : {
                breakpoint: 'md',
                content: (
                  <MobileNav header={t('Main navigation')}>
                    {navItems.map((item) => (
                      <DrawerItem key={item.href} {...item} />
                    ))}
                    {user ? (
                      <>
                        <DrawerItem
                          label={t('Profile')}
                          href="/profile"
                          isSelected={pathname.startsWith('/profile')}
                        />
                        <DrawerItem label={t('Sign out')} onClick={signOut} />
                      </>
                    ) : (
                      <DrawerItem label={t('Sign in')} href="/sign-in" />
                    )}
                  </MobileNav>
                ),
              }
        }
        topNav={
          !bare && (
            <TopNav
              label={t('Main navigation')}
              startContent={navItems.map((item) => <TopNavItem key={item.href} {...item} />)}
              endContent={
                <>
                  <LanguagePicker />
                  <DesktopAccountLinks
                    isSignedIn={!!user}
                    isProfileSelected={pathname.startsWith('/profile')}
                    onSignOut={signOut}
                  />
                </>
              }
            />
          )
        }
      >
        <VStack
          gap={bare ? 6 : 10}
          minHeight={bare ? '100dvh' : undefined}
          padding={bare ? 6 : undefined}
          vAlign={bare ? 'center' : undefined}
          className="page-frame"
          ref={pageFrame}
        >
          <OutcomeNotice />
          <Outlet />
        </VStack>
        {!authPage && <PreviewControls />}
      </AppShell>
    </LinkProvider>
  );
}
