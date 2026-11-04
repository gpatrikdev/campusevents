import { createFileRoute } from '@tanstack/react-router';
import { OrganizersPage } from '../pages/OrganizersPage';

export const Route = createFileRoute('/staff/permissions')({ component: OrganizersPage });
