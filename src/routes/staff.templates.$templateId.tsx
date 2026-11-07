import { createFileRoute } from '@tanstack/react-router';
import { TemplateEditorPage } from '../pages/TemplateEditorPage';

export const Route = createFileRoute('/staff/templates/$templateId')({ component: Page });
function Page() {
  const { templateId } = Route.useParams();
  return <TemplateEditorPage templateId={templateId} />;
}
