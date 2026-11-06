// Copyright (c) Meta Platforms, Inc. and affiliates.

import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Divider } from '@astryxdesign/core/Divider';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleSignInButton, LoginCard } from '../app/login-card/LoginCard';
import { MailIcon } from '../components/EventIcons';
import { emailSchema } from '../domain/rules';
import { useMock } from './hooks';

export default function SignInPage({ returnTo }: { returnTo: string }) {
  const { t } = useTranslation();
  const { setIdentity, failActions, setOutcome } = useMock();
  const navigate = useNavigate();
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
    <LoginCard
      description={t('Use Google or an email magic link. Anyone can create an account.')}
      footer={
        <Text as="p" type="supporting" justify="center">
          {t('Authentication is simulated. No external account is connected.')}
        </Text>
      }
    >
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
                icon={<Icon icon={MailIcon} size="sm" />}
                size="lg"
                width="100%"
              />
            </VStack>
          </form>
          <Divider label={t('or continue with')} />
          <GoogleSignInButton label={t('Simulate Google sign-in')} clickAction={continueDemo} />
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
          <Button label={t('Use another email')} variant="ghost" onClick={() => setStep('email')} />
        </>
      )}
    </LoginCard>
  );
}
