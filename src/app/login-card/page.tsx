// Copyright (c) Meta Platforms, Inc. and affiliates.

import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Center } from '@astryxdesign/core/Center';
import { Divider } from '@astryxdesign/core/Divider';
import { Heading } from '@astryxdesign/core/Heading';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { Navigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { auth } from '../../api/client';
import { useApp } from '../../api/context';
import { emailSchema } from '../../domain/rules';

export default function SignInPage({ returnTo }: { returnTo: string }) {
  const { preview } = useApp();
  return preview ? <preview.SignIn returnTo={returnTo} /> : <SignIn returnTo={returnTo} />;
}

function SignIn({ returnTo }: { returnTo: string }) {
  const { t, i18n } = useTranslation();
  const { user, googleEnabled } = useApp();
  const compact = useMediaQuery('(max-width: 42rem)');
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
    <Center axis="both" padding={6} paddingInline={compact ? 0 : 6}>
      <VStack gap={4} hAlign="center" width="100%" maxWidth="25rem">
        <Card padding={compact ? 4 : 8} width="100%">
          <VStack gap={4} hAlign="stretch">
            <VStack gap={1} hAlign="center">
              <Heading level={1} justify="center" textWrap="balance">
                {t('Sign in to take part')}
              </Heading>
              <Text as="p" color="secondary" justify="center">
                {t(
                  googleEnabled
                    ? 'Use Google or an email magic link. Anyone can create an account.'
                    : 'Sign in with an email magic link. Anyone can create an account.',
                )}
              </Text>
            </VStack>
            {error && (
              <VStack role="alert">
                <Banner title={t(error)} status="error" />
              </VStack>
            )}
            {sent ? (
              <>
                <VStack role="status">
                  <Banner title={t('Check your email')} status="info" collapsible={false}>
                    <Text>
                      {t('Open the sign-in link sent to {{email}}.', { email: email.trim() })}
                    </Text>
                  </Banner>
                </VStack>
                <Button
                  label={t('Use another email')}
                  variant="ghost"
                  onClick={() => setSent(false)}
                />
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
                      size="lg"
                      width="100%"
                      isLoading={pending}
                    />
                  </VStack>
                </form>
                {googleEnabled && (
                  <>
                    <Divider label={t('or continue with')} />
                    <Button
                      label={t('Continue with Google')}
                      size="lg"
                      width="100%"
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
          </VStack>
        </Card>
      </VStack>
    </Center>
  );
}
