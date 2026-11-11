import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router';
import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import './index.css';
import App from './App';
import { useColorMode } from './shared/colorMode';

function Root() {
  const mode = useColorMode();
  return (
    <Theme theme={neutralTheme} mode={mode}>
      {/* HashRouter: GitHub Pages has no SPA fallback, so deep links need the hash. */}
      <HashRouter>
        <App />
      </HashRouter>
    </Theme>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
