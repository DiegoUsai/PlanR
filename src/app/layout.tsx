import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "@/theme/theme";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "PlanR — Resource Planning",
  description: "Resource Planning per la BU Documentale & SAP",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it">
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <AppShell>{children}</AppShell>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
