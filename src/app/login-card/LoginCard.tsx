// Copyright (c) Meta Platforms, Inc. and affiliates.

import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Center } from '@astryxdesign/core/Center';
import { Heading } from '@astryxdesign/core/Heading';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import type { ReactNode, SVGProps } from 'react';
import { useTranslation } from 'react-i18next';

export function LoginCard({
  description,
  children,
  footer,
}: {
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const compact = useMediaQuery('(max-width: 42rem)');

  return (
    <Center axis="both" padding={6} paddingInline={compact ? 0 : 6}>
      <VStack gap={4} hAlign="center" width="100%" maxWidth="25rem">
        <VStack gap={2} hAlign="center">
          <Icon icon="calendar" size="lg" />
          <Text weight="bold" size="lg">
            Campus Events
          </Text>
        </VStack>
        <Card padding={compact ? 4 : 8} width="100%">
          <VStack gap={4} hAlign="stretch">
            <VStack gap={1} hAlign="center">
              <Heading
                level={1}
                justify="center"
                textWrap="balance"
                style={{
                  fontSize: 'var(--text-heading-2-size)',
                  lineHeight: 'var(--text-heading-2-leading)',
                }}
              >
                {t('Sign in to take part')}
              </Heading>
              <Text as="p" size="sm" color="secondary" justify="center" textWrap="balance">
                {description}
              </Text>
            </VStack>
            {children}
          </VStack>
        </Card>
        {footer}
      </VStack>
    </Center>
  );
}

function GoogleMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function GoogleSignInButton({
  label,
  clickAction,
}: {
  label: string;
  clickAction: () => void | Promise<void>;
}) {
  return (
    <Button
      label={label}
      variant="secondary"
      icon={<Icon icon={GoogleMark} size="sm" />}
      size="lg"
      width="100%"
      clickAction={clickAction}
    />
  );
}
