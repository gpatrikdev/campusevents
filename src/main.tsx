import '@astryxdesign/core/reset.css';
import '@astryxdesign/core/astryx.css';
import 'survey-core/survey-core.css';
import './app.css';
import './i18n';
import { InternationalizationProvider } from '@astryxdesign/core/i18n';
import huCatalog from '@astryxdesign/core/locales/hu-HU.generated.js';
import { Theme } from '@astryxdesign/core/theme';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRouter, RouterProvider } from '@tanstack/react-router';
import { createRoot } from 'react-dom/client';
import { useTranslation } from 'react-i18next';
import { defaultThemeSlug, themes } from './astryx-themes';
import { routeTree } from './routeTree.gen';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});
const isPreview = import.meta.env.DEV && import.meta.env.MODE === 'mock-preview';
const router = createRouter({
  routeTree,
  basepath: isPreview ? '/__preview' : '/',
  scrollRestoration: true,
  defaultPreload: 'intent',
});
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

async function start() {
  const content = <RouterProvider router={router} />;
  let app = content;
  if (import.meta.env.DEV && isPreview) {
    const { MockProvider } = await import('./mocks/MockProvider');
    app = <MockProvider>{content}</MockProvider>;
  }
  const root = document.getElementById('root');
  if (!root) throw new Error('The app root is missing');
  createRoot(root).render(<App>{app}</App>);
}

function App({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  return (
    <Theme theme={themes[defaultThemeSlug]}>
      <InternationalizationProvider
        locale={i18n.language}
        messages={{ 'hu-HU': huCatalog, hu: huCatalog }}
      >
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </InternationalizationProvider>
    </Theme>
  );
}

void start();
