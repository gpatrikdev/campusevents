import { createFileRoute } from '@tanstack/react-router';
import { StaffPage } from '../pages/StaffPages';

export const Route = createFileRoute('/staff/')({ component: StaffPage });
