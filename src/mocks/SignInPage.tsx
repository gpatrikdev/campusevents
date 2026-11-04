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
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { emailSchema } from '../domain/rules';
import { useMock } from './hooks';

export default function SignInPage({ returnTo }: { returnTo: string }) {
  const { t } = useTranslation();
  const { setIdentity, failActions, setOutcome } = useMock();
  const navigate = useNavigate();
  const compact = useMediaQuery('(max-width: 42rem)');
  const [email, setEmail] = useState('');
  const [invalid, setInvalid] = useState(false);
  const [step, setStep] = useState<'email' | 'preview'>('email');
  function continueDemo() {
    if (failActions) {
      setOutcome({ ok: false, message: 'Simulated action failed. No change was saved.' });
      return;
    }
    setIdentity('new');
    void navigate({ to: '/complete-profile', search: { returnTo } });
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
                {t('Use Google or an email magic link. Anyone can create an account.')}
              </Text>
            </VStack>
            {step === 'email' ? (
              <>
                <form
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!emailSchema.safeParse(email.trim()).success) {
                      setInvalid(true);
                      return;
                    }
                    if (failActions) {
                      setOutcome({
                        ok: false,
                        message: 'Simulated action failed. No change was saved.',
                      });
                      return;
                    }
                    setStep('preview');
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
                      label={t('Preview magic-link email')}
                      type="submit"
                      variant="primary"
                      size="lg"
                      width="100%"
                    />
                  </VStack>
                </form>
                <Divider label={t('or continue with')} />
                <Button
                  label={t('Simulate Google sign-in')}
                  onClick={continueDemo}
                  size="lg"
                  width="100%"
                />
              </>
            ) : (
              <>
                <Banner title={t('Email preview only')} status="info" collapsible={false}>
                  <Text>
                    {t(
                      'No email was sent to {{email}}. Continue below to explore the first-login flow.',
                      { email: email.trim() },
                    )}
                  </Text>
                </Banner>
                <Button
                  label={t('Continue as demo user')}
                  onClick={continueDemo}
                  variant="primary"
                  size="lg"
                />
                <Button
                  label={t('Use another email')}
                  variant="ghost"
                  onClick={() => setStep('email')}
                />
              </>
            )}
          </VStack>
        </Card>
        <Text as="p" type="supporting" justify="center">
          {t('Authentication is simulated. No external account is connected.')}
        </Text>
      </VStack>
    </Center>
  );
}
