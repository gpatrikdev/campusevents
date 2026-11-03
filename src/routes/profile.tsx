import { createFileRoute } from '@tanstack/react-router';
import ProfilePage from '../app/settings-sidebar/page';

export const Route = createFileRoute('/profile')({ component: ProfilePage });
