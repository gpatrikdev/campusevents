import { Banner } from '@astryxdesign/core/Banner';
import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { VStack } from '@astryxdesign/core/VStack';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { profileSchema } from '../domain/rules';
import { useMock } from '../mocks/hooks';

export function returnSearch(search: Record<string, unknown>) {
  const value = search.returnTo;
  return {
    returnTo:
      typeof value === 'string' &&
      (value === '/registrations' || /^\/events\/[a-z0-9-]+$/.test(value))
        ? value
        : '/',
  };
}

export function CompleteProfilePage({ returnTo }: { returnTo: string }) {
  const { t } = useTranslation();
  const { user, run } = useMock();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? '');
  const [invalid, setInvalid] = useState(false);
  return (
    <VStack gap={6} className="form-page" maxWidth={480} width="100%">
      <Card padding={8}>
        <VStack gap={6}>
          <VStack gap={3}>
            <Heading level={1}>{t('Complete your profile')}</Heading>
            <Text color="secondary">
              {t('Confirm the name that will appear on your tickets and certificates.')}
            </Text>
          </VStack>
          {!user ? (
            <>
              <Text>{t('Sign in to continue.')}</Text>
              <Button
                label={t('Sign in')}
                href={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
              />
            </>
          ) : user.profileComplete ? (
            <>
              <Text>{t('Profile names cannot be changed after confirmation.')}</Text>
              <Button label={t('Browse events')} href={returnTo} />
            </>
          ) : (
            <form
              noValidate
              onSubmit={(e) => {
                e.preventDefault();
                const result = profileSchema.safeParse(name);
                if (!result.success) {
                  setInvalid(true);
                  return;
                }
                const outcome = run({ type: 'profile', name: result.data });
                if (outcome.ok) void navigate({ to: returnTo });
              }}
            >
              <VStack gap={6}>
                <TextInput
                  label={t('Full name')}
                  value={name}
                  onChange={(value) => {
                    setName(value);
                    setInvalid(false);
                  }}
                  isRequired
                  autoComplete="name"
                  status={
                    invalid
                      ? { type: 'error', message: t('Enter a name between 2 and 120 characters.') }
                      : undefined
                  }
                />
                <Banner
                  title={t('Your name cannot be changed after confirmation, including by staff.')}
                  status="info"
                />
                <Button label={t('Confirm name and continue')} type="submit" variant="primary" />
              </VStack>
            </form>
          )}
        </VStack>
      </Card>
    </VStack>
  );
}
