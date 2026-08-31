import type { Metadata } from "next";
import Providers from "./providers";
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "PlanR — Resource Planning",
  description: "Resource Planning per la BU Documentale & SAP",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
