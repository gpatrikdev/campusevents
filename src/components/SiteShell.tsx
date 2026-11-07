import { AppShell, useAppShellMobile } from '@astryxdesign/core/AppShell';
import { Button } from '@astryxdesign/core/Button';
import { LinkProvider } from '@astryxdesign/core/Link';
import { MobileNav } from '@astryxdesign/core/MobileNav';
import { Selector } from '@astryxdesign/core/Selector';
import { SideNav, SideNavItem, SideNavSection } from '@astryxdesign/core/SideNav';
import { TopNav, TopNavItem } from '@astryxdesign/core/TopNav';
import { VStack } from '@astryxdesign/core/VStack';
import {
  Navigate,
  Outlet,
  Link as RouterLink,
  useRouter,
  useRouterState,
} from '@tanstack/react-router';
import { type ComponentProps, forwardRef, useContext, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AppContext, useApp } from '../api/context';
import { LiveProvider } from '../api/LiveProvider';
import { isStaff } from '../domain/rules';
import { returnSearch } from '../pages/AuthPages';
import { ReviewIcon, TicketIcon } from './EventIcons';
import { belowNavHeight, DataBoundary, OutcomeNotice } from './Feedback';
import { HungaryFlag, UnitedKingdomFlag } from './Flags';
import { DashboardIcon, HomeIcon, PeopleIcon, SignInIcon, SignOutIcon, UserIcon } from './NavIcons';

// The router marks a link as the current page whenever the URL starts with its
// path, so /staff would also count on /staff/permissions. Matching only the exact
// path leaves that to each Astryx nav item's isSelected.
export const ClientLink = forwardRef<HTMLAnchorElement, ComponentProps<'a'>>(
  ({ href, ...props }, ref) => (
    <RouterLink to={href ?? '/'} activeOptions={{ exact: true }} {...props} ref={ref} />
  ),
);

const isPublicEventPage = (pathname: string) => pathname === '/' || pathname.startsWith('/events/');

function focusPageHeading(frame: HTMLElement | null) {
  const heading =
    frame?.querySelector<HTMLElement>('#staff-task-heading') ?? frame?.querySelector('h1');
  if (heading) {
    heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }
}

export function LanguagePicker() {
  const { t, i18n } = useTranslation();
  const { setLanguage } = useApp();
  return (
    <Selector
      label={t('Language')}
      isLabelHidden
      variant="ghost"
      size="sm"
      value={i18n.language}
      options={[
        { value: 'en', label: 'English', icon: UnitedKingdomFlag },
        { value: 'hu', label: 'Magyar', icon: HungaryFlag },
      ]}
      onChange={(language) => {
        if (language === 'en' || language === 'hu') void setLanguage(language);
      }}
    />
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
  return useContext(AppContext) ? (
    <Shell />
  ) : (
    <LiveProvider>
      <Shell />
    </LiveProvider>
  );
}

function Shell() {
  const { t, i18n } = useTranslation();
  const { user, data, signOut, dataState, preview } = useApp();
  const router = useRouter();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const publicPage = isPublicEventPage(pathname);
  const staffEventId = pathname.match(/^\/staff\/events\/([^/]+)/)?.[1];
  const staffEvent = data.events.find((event) => event.id === staffEventId);
  const authPage = /^\/(sign-in|complete-profile)\/?$/.test(pathname);
  const notFound = useRouterState({
    select: (state) => state.matches.some((match) => match._notFound),
  });
  // Sign-in, profile completion and unknown URLs render without navigation.
  const bare = authPage || notFound;
  // Dashboard pages draw their own header and insets with an Astryx Layout. The
  // draft preview is left out because it must look like the public event page.
  const staffWorkspace =
    !bare && /^\/staff(\/|$)/.test(pathname) && !/\/preview\/?$/.test(pathname);
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
      : pathname.startsWith('/staff/permissions')
        ? t('Permissions')
        : pathname.startsWith('/staff/templates')
          ? t('Review templates')
          : pathname.startsWith('/staff')
            ? t('Staff dashboard')
            : pathname.startsWith('/registrations')
              ? t('Registrations')
              : pathname.startsWith('/profile')
                ? t('Profile')
                : pathname.startsWith('/sign-in')
                  ? t('Sign in')
                  : pathname.startsWith('/complete-profile')
                    ? t('Complete your profile')
                    : /^\/reviews\/?$/.test(pathname)
                      ? t('Reviews')
                      : pathname.startsWith('/reviews/')
                        ? t('Your review')
                        : pathname.startsWith('/review')
                          ? t('Review this event')
                          : t('Events');
    const staffTask = pathname.endsWith('/attendees')
      ? t('Attendees')
      : pathname.endsWith('/scan')
        ? t('QR scanner')
        : pathname.endsWith('/reviews')
          ? t('Review results')
          : pathname.endsWith('/edit')
            ? t('Edit draft')
            : pathname.endsWith('/preview')
              ? t('Preview event')
              : '';
    const staffTitle = staffEvent && [staffTask, staffEvent.title].filter(Boolean).join(' · ');
    document.title = `${staffTitle || eventTitle || title} · ${'Campus Events'}`;
  }, [eventTitle, staffEvent, notFound, pathname, t]);
  useEffect(
    () =>
      router.subscribe('onRendered', ({ fromLocation, toLocation, pathChanged }) => {
        if (
          !pathChanged ||
          !fromLocation ||
          !(
            (isPublicEventPage(fromLocation.pathname) && isPublicEventPage(toLocation.pathname)) ||
            toLocation.pathname.startsWith('/staff')
          )
        )
          return;
        focusPageHeading(pageFrame.current);
      }),
    [router],
  );
  useEffect(() => {
    if (staffWorkspace && dataState === 'ready') focusPageHeading(pageFrame.current);
  }, [staffWorkspace, dataState]);

  // The icons show only in the phone menu, beside the Dashboard section's
  // icons. The desktop top bar stays text only.
  const navItems = [{ label: t('Events'), href: '/', icon: HomeIcon, isSelected: publicPage }];
  if (user)
    navItems.push({
      label: t('Registrations'),
      href: '/registrations',
      icon: TicketIcon,
      isSelected: pathname.startsWith('/registrations'),
    });
  if (user)
    navItems.push({
      label: t('Reviews'),
      href: '/reviews',
      icon: ReviewIcon,
      // Covers the form at /review/<event> as well as /reviews.
      isSelected: pathname.startsWith('/review'),
    });
  if (isStaff(user))
    navItems.push({
      label: t('Dashboard'),
      href: '/staff',
      icon: DashboardIcon,
      isSelected: pathname.startsWith('/staff'),
    });
  // Dashboard pages get their own side nav. Only staff see it, since anyone
  // else gets an access notice there.
  const permissionsPage = pathname.startsWith('/staff/permissions');
  const templatesPage = pathname.startsWith('/staff/templates');
  const dashboardItems: ComponentProps<typeof SideNavItem>[] =
    !bare && isStaff(user) && pathname.startsWith('/staff')
      ? [
          {
            label: t('Events'),
            href: '/staff',
            icon: 'calendar',
            isSelected: !permissionsPage && !templatesPage,
          },
          {
            label: t('Review templates'),
            href: '/staff/templates',
            icon: ReviewIcon,
            isSelected: templatesPage,
          },
        ]
      : [];
  if (dashboardItems.length > 0 && user?.role === 'admin')
    dashboardItems.push({
      label: t('Permissions'),
      href: '/staff/permissions',
      icon: PeopleIcon,
      isSelected: permissionsPage,
    });

  if (!preview && user && !user.profileComplete && !authPage) {
    return <Navigate to="/complete-profile" search={returnSearch({ returnTo: pathname })} />;
  }

  return (
    <LinkProvider component={ClientLink}>
      <AppShell
        height="auto"
        variant="elevated"
        contentPadding={bare || staffWorkspace ? 0 : 6}
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
                    {dashboardItems.length > 0 && (
                      <SideNavSection title={t('Dashboard')}>
                        {dashboardItems.map((item) => (
                          <DrawerItem key={item.href} {...item} />
                        ))}
                      </SideNavSection>
                    )}
                    {user ? (
                      // Its own section, so it doesn't read as part of Dashboard.
                      <SideNavSection title={t('Account')} isHeaderHidden>
                        <DrawerItem
                          label={t('Profile')}
                          href="/profile"
                          icon={UserIcon}
                          isSelected={pathname.startsWith('/profile')}
                        />
                        <DrawerItem label={t('Sign out')} icon={SignOutIcon} onClick={signOut} />
                      </SideNavSection>
                    ) : (
                      <DrawerItem label={t('Sign in')} icon={SignInIcon} href="/sign-in" />
                    )}
                  </MobileNav>
                ),
              }
        }
        sideNav={
          dashboardItems.length > 0 && (
            <SideNav aria-label={t('Dashboard')}>
              {dashboardItems.map((item) => (
                <SideNavItem key={item.href} {...item} />
              ))}
            </SideNav>
          )
        }
        topNav={
          !bare && (
            <TopNav
              label={t('Main navigation')}
              startContent={navItems.map(({ label, href, isSelected }) => (
                <TopNavItem key={href} label={label} href={href} isSelected={isSelected} />
              ))}
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
          gap={bare ? 6 : staffWorkspace ? 0 : 10}
          // Fills the window, so the shell's grey never shows under a short page.
          minHeight={
            bare ? '100dvh' : staffWorkspace ? 'calc(100dvh - var(--spacing-12))' : belowNavHeight
          }
          padding={bare ? 6 : undefined}
          vAlign={bare ? 'center' : undefined}
          className={staffWorkspace ? 'page-frame staff-workspace' : 'page-frame'}
          ref={pageFrame}
        >
          <OutcomeNotice />
          {!preview && dataState !== 'ready' && (!staffWorkspace || !isStaff(user)) ? (
            <DataBoundary isPage>{null}</DataBoundary>
          ) : (
            <Outlet />
          )}
        </VStack>
      </AppShell>
    </LinkProvider>
  );
}
