// Copyright (c) Meta Platforms, Inc. and affiliates.

import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { Navigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { auth } from '../../api/client';
import { useApp } from '../../api/context';
import { MailIcon } from '../../components/EventIcons';
import { emailSchema } from '../../domain/rules';
import { GoogleSignInButton, LoginCard } from './LoginCard';

export default function SignInPage({ returnTo }: { returnTo: string }) {
  const { preview } = useApp();
  return preview ? <preview.SignIn returnTo={returnTo} /> : <SignIn returnTo={returnTo} />;
}

function SignIn({ returnTo }: { returnTo: string }) {
  const { t, i18n } = useTranslation();
  const { user, googleEnabled } = useApp();
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(
    new URLSearchParams(window.location.search).has('error')
      ? 'Sign-in could not be completed. Please try again.'
      : '',
  );
  if (user) {
    return user.profileComplete ? (
      <Navigate to={returnTo} />
    ) : (
      <Navigate to="/complete-profile" search={{ returnTo }} />
    );
  }
  const callbacks = {
    callbackURL: returnTo,
    newUserCallbackURL: `/complete-profile?returnTo=${encodeURIComponent(returnTo)}`,
    errorCallbackURL: `/sign-in?returnTo=${encodeURIComponent(returnTo)}`,
  };

  async function sendLink() {
    if (pending) return;
    const parsed = emailSchema.safeParse(email.trim());
    setInvalid(!parsed.success);
    if (!parsed.success) return;
    setPending(true);
    setError('');
    try {
      const { error } = await auth.signIn.magicLink({
        email: parsed.data,
        metadata: { language: i18n.language },
        ...callbacks,
      });
      if (error) throw error;
      setSent(true);
    } catch {
      setError('The sign-in email could not be sent. Try again shortly.');
    } finally {
      setPending(false);
    }
  }

  return (
    <LoginCard
      description={t(
        googleEnabled
          ? 'Use Google or an email magic link. Anyone can create an account.'
          : 'Sign in with an email magic link. Anyone can create an account.',
      )}
    >
      {error && (
        <VStack role="alert">
          <Banner title={t(error)} status="error" />
        </VStack>
      )}
      {sent ? (
        <>
          <VStack role="status">
            <Banner title={t('Check your email')} status="info" collapsible={false}>
              <Text>{t('Open the sign-in link sent to {{email}}.', { email: email.trim() })}</Text>
            </Banner>
          </VStack>
          <Button label={t('Use another email')} variant="ghost" onClick={() => setSent(false)} />
        </>
      ) : (
        <>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void sendLink();
            }}
          >
            <VStack gap={4} hAlign="stretch">
              <TextInput
                label={t('Email address')}
                value={email}
                onChange={(value) => {
                  setEmail(value);
                  setInvalid(false);
                }}
                type="email"
                autoComplete="email"
                size="lg"
                isRequired
                status={
                  invalid
                    ? { type: 'error', message: t('Enter a valid email address.') }
                    : undefined
                }
              />
              <Button
                label={t('Send sign-in link')}
                type="submit"
                variant="primary"
                icon={<Icon icon={MailIcon} size="sm" />}
                size="lg"
                width="100%"
                isLoading={pending}
              />
            </VStack>
          </form>
          {googleEnabled && (
            <>
              <Divider label={t('or continue with')} />
              <GoogleSignInButton
                label={t('Continue with Google')}
                clickAction={async () => {
                  setError('');
                  try {
                    const { error } = await auth.signIn.social({
                      provider: 'google',
                      ...callbacks,
                    });
                    if (error) throw error;
                  } catch {
                    setError('Google sign-in could not be started. Try again.');
                  }
                }}
              />
            </>
          )}
        </>
      )}
    </LoginCard>
  );
}
