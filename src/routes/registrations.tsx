import { createFileRoute } from '@tanstack/react-router';
import { RegistrationsPage } from '../pages/RegistrationsPage';

export const Route = createFileRoute('/registrations')({ component: RegistrationsPage });
