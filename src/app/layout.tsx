import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { ThemeProvider, themeScript } from "@/components/theme/ThemeProvider";
import { ThemeFavicon } from "@/components/theme/ThemeFavicon";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Overview | Studio Assistant",
    template: "%s | Studio Assistant",
  },
  description: "A focused administrative workspace for Studio Assistant.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link id="theme-favicon" rel="icon" type="image/svg+xml" sizes="any" href="/favicon-dark.svg" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>
          <ThemeFavicon />
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
