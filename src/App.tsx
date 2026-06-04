import { Authenticated, Refine, useGetIdentity } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import {
  ErrorComponent,
  RefineSnackbarProvider,
  ThemedLayout,
  useNotificationProvider,
} from "@refinedev/mui";
import Navkit from '@taruvi/navkit';
import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import CssBaseline from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";
import routerProvider, { DocumentTitleHandler } from "@refinedev/react-router";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router";
import { taruviClient } from "./taruviClient";
import {
  taruviDataProvider,
  taruviAuthProvider,
  taruviStorageProvider,
  taruviAppProvider,
  taruviUserProvider,
  // taruviAccessControlProvider, // Uncomment to enable Cerbos-based access control
  type TaruviUser,
} from "./providers/refineProviders";
import { CustomSider, ErrorBoundary, UnsavedChangesDialog } from "./components";
import { LoginRedirect } from "./components/auth/LoginRedirect";
import { ColorModeContextProvider, ColorModeContext } from "./contexts/color-mode";
import {AppSettingsProvider, useAppSettings} from "./contexts/app-settings";
import { useContext, useRef, useEffect } from "react";
import { Home } from "./pages/home";
import { Login } from "./pages/login";
import { CompaniesList, CompanyShow } from "./pages/companies";
import { ThemesList } from "./pages/themes";
import { Onboarding } from "./pages/onboarding";
import { GitHubCallback } from "./pages/github-callback";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import StyleRoundedIcon from "@mui/icons-material/StyleRounded";

// ─── Role helpers ────────────────────────────────────────────────────────────
const ADMIN_ROLE_SLUGS = new Set([
  "hackathonapp-admin",
  "hackathonapp-super-admin",
]);

function useIsAdmin() {
  const { data: identity, isLoading } = useGetIdentity<TaruviUser>();
  const isAdmin =
    identity?.roles?.some((r) => ADMIN_ROLE_SLUGS.has(r.slug)) ?? false;
  return { isAdmin, isLoading };
}

// Redirects to /onboarding for non-admins, renders children for admins.
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useIsAdmin();
  if (isLoading) return <LinearProgress />;
  if (!isAdmin) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

// Index route: admins → Home, everyone else → /onboarding.
function RoleBasedHome() {
  const { isAdmin, isLoading } = useIsAdmin();
  if (isLoading) return <LinearProgress />;
  return isAdmin ? <Home /> : <Navigate to="/onboarding" replace />;
}

const AppContent = () => {
  const { setMode } = useContext(ColorModeContext);
  const navRef = useRef<HTMLDivElement>(null);
  const { settings } = useAppSettings()

  useEffect(() => {
    if (navRef.current) {
      const height = navRef.current.offsetHeight;
      document.documentElement.style.setProperty('--nav-height', `${height}px`);
    }
  }, []);

  return (
    <>
      <div
        ref={navRef}
        data-nav-container
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 1300,
          width: '100%',
        }}
      >
        <Navkit
          client={taruviClient}
          getTheme={(theme) => setMode(theme)}
        />
      </div>
      <RefineSnackbarProvider>
            <DevtoolsProvider>
              <Refine
                dataProvider={{
                  default: taruviDataProvider,
                  storage: taruviStorageProvider,
                  app: taruviAppProvider,
                  user: taruviUserProvider,
                }}
                notificationProvider={useNotificationProvider}
                routerProvider={routerProvider}
                authProvider={taruviAuthProvider}
                // accessControlProvider={taruviAccessControlProvider} // Uncomment to enable Cerbos-based access control
                resources={[
                  {
                    name: "companies",
                    list: "/companies",
                    show: "/companies/:id",
                    meta: {
                      label: "Companies",
                      icon: <BusinessRoundedIcon />,
                      canDelete: true,
                    },
                  },
                  {
                    name: "themes",
                    list: "/themes",
                    meta: {
                      label: "Themes",
                      icon: <StyleRoundedIcon />,
                    },
                  },
                ]}
                options={{
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
                  projectId: "obEpHJ-M7JimA-31GF1J",
                }}
              >
                <Routes>
                  <Route
                    element={
                      <Authenticated
                        key="login-route"
                        fallback={<Outlet />}
                      >
                        <Navigate to="/" replace />
                      </Authenticated>
                    }
                  >
                    <Route path="/login" element={<Login />} />
                  </Route>
                  {/* Authenticated wrapper — no layout (full-screen routes) */}
                  <Route
                    element={
                      <Authenticated
                        key="authenticated-inner"
                        fallback={<LoginRedirect />}
                      >
                        <Outlet />
                      </Authenticated>
                    }
                  >
                    <Route path="onboarding" element={<Onboarding />} />
                    <Route path="github/callback" element={<GitHubCallback />} />

                    {/* Admin portal — requires Admin or Super Admin role */}
                    <Route
                      element={
                        <RequireAdmin>
                          <ThemedLayout
                            Header={() => null}
                            Sider={CustomSider}
                            initialSiderCollapsed={true}
                            childrenBoxProps={{ sx: { p: 0 } }}
                          >
                            <Box sx={{ ml: { xs: 0, md: '72px' }, transition: 'margin-left 0.2s ease-in-out' }}>
                              <ErrorBoundary>
                                <Outlet />
                              </ErrorBoundary>
                            </Box>
                          </ThemedLayout>
                        </RequireAdmin>
                      }
                    >
                      <Route index element={<RoleBasedHome />} />
                      <Route path="companies" element={<CompaniesList />} />
                      <Route path="companies/:id" element={<CompanyShow />} />
                      <Route path="themes" element={<ThemesList />} />
                      <Route path="*" element={<ErrorComponent />} />
                    </Route>
                  </Route>
                </Routes>

                <RefineKbar />
                <UnsavedChangesDialog />
                <DocumentTitleHandler handler={() => settings?.displayName || ""}/>
              </Refine>
              <DevtoolsPanel />
            </DevtoolsProvider>
          </RefineSnackbarProvider>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ColorModeContextProvider>
          <AppSettingsProvider>
            <CssBaseline />
            <GlobalStyles
              styles={{
                html: { WebkitFontSmoothing: 'antialiased' },
                body: { fontFamily: "'Open Sans', sans-serif" },
                'h1, h2, h3, h4, h5, h6': { fontFamily: "'Quicksand', sans-serif" },
                '*::-webkit-scrollbar': { width: 8, height: 8 },
                '*::-webkit-scrollbar-track': { background: 'transparent' },
                '*::-webkit-scrollbar-thumb': {
                  background: 'rgba(0,0,0,0.18)',
                  borderRadius: 8,
                },
                '*::-webkit-scrollbar-thumb:hover': { background: 'rgba(0,0,0,0.32)' },
                '[data-theme="dark"] *::-webkit-scrollbar-thumb': {
                  background: 'rgba(255,255,255,0.18)',
                },
              }}
            />
            <AppContent />
          </AppSettingsProvider>
        </ColorModeContextProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
