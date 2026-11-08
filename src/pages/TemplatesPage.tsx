import { Button } from '@astryxdesign/core/Button';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { HStack } from '@astryxdesign/core/HStack';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Icon } from '@astryxdesign/core/Icon';
import { Layout, LayoutContent, LayoutHeader } from '@astryxdesign/core/Layout';
import { Link } from '@astryxdesign/core/Link';
import { pixel, proportional, Table } from '@astryxdesign/core/Table';
import { Text } from '@astryxdesign/core/Text';
import { VStack } from '@astryxdesign/core/VStack';
import { useTranslation } from 'react-i18next';
import { useApp } from '../api/context';
import { PlusIcon } from '../components/EventIcons';
import { AccessNotice, DataBoundary } from '../components/Feedback';
import { isStaff } from '../domain/rules';

export function TemplatesPage() {
  const { t } = useTranslation();
  const { user, data, dataState } = useApp();
  const compact = useMediaQuery('(max-width: 42rem)');
  if (!isStaff(user)) return <AccessNotice />;
  const rows = (data.templates ?? []).map(({ id, name, form }) => ({
    id,
    name,
    questions: form.elements.length,
  }));
  return (
    <Layout
      height="auto"
      padding={compact ? 4 : 6}
      header={
        <LayoutHeader hasDivider>
          <VStack gap={3}>
            <HStack hAlign="between" gap={4} wrap="wrap" vAlign="center">
              <Heading level={1}>{t('Review templates')}</Heading>
              <Button
                label={t('New template')}
                icon={<Icon icon={PlusIcon} />}
                href="/staff/templates/new"
                variant="primary"
              />
            </HStack>
            <Text color="secondary">
              {t(
                'A draft copies a template into its own review form. Editing a template later does not change events.',
              )}
            </Text>
          </VStack>
        </LayoutHeader>
      }
      content={
        <LayoutContent isScrollable={false}>
          <DataBoundary
            pending={dataState === 'loading'}
            empty={rows.length === 0}
            title="No review templates yet"
            description="Create a template to reuse its questions across events."
          >
            <Card>
              <Table
                data={rows}
                idKey="id"
                hasHover
                textOverflow="truncate"
                columns={[
                  {
                    key: 'name',
                    header: t('Name'),
                    width: proportional(1, { minWidth: 160 }),
                    renderCell: (row) => (
                      <Link href={`/staff/templates/${row.id}`} color="primary">
                        <Text type="inherit" weight="semibold" maxLines={1}>
                          {row.name}
                        </Text>
                      </Link>
                    ),
                  },
                  {
                    key: 'questions',
                    header: t('Questions'),
                    width: pixel(120),
                  },
                ]}
              />
            </Card>
          </DataBoundary>
        </LayoutContent>
      }
    />
  );
}
