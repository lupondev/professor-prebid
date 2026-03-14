import React from 'react';
import { createRoot } from 'react-dom/client';
import { OptionsContextProvider } from '../Shared/contexts/optionsContext';
import { StateContextProvider } from '../Shared/contexts/appStateContext';
import { InspectedPageContextProvider } from '../Shared/contexts/inspectedPageContext';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme/theme';
import { ErrorBoundary } from 'react-error-boundary';
import ErrorCardComponent from '../Shared/components/ErrorCardComponent';
import Panel from '../Panel/Panel';

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ThemeProvider theme={theme}>
      <OptionsContextProvider>
        <InspectedPageContextProvider>
          <StateContextProvider>
            <ErrorBoundary FallbackComponent={ErrorCardComponent}>
              <Panel />
            </ErrorBoundary>
          </StateContextProvider>
        </InspectedPageContextProvider>
      </OptionsContextProvider>
    </ThemeProvider>
  );
}
