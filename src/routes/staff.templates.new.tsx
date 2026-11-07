import { createFileRoute } from '@tanstack/react-router';
import { TemplateEditorPage } from '../pages/TemplateEditorPage';

export const Route = createFileRoute('/staff/templates/new')({
  component: () => <TemplateEditorPage />,
});
