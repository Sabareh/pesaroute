import type { Metadata } from "next";
import "./globals.css";
import { AppFrame } from "./components/AppFrame";
import { AuthProvider } from "./lib/auth";

export const metadata: Metadata = {
  title: "PesaRoute | Kenya-first investment decisions",
  description: "Educational comparison, simulation, scam checks, journaling, and private portfolio mirroring for Kenyan investors."
};

// Sets the theme class before first paint to avoid a flash. Saved choice wins;
// otherwise fall back to the OS/browser preference.
const themeScript = `(function(){try{var t=localStorage.getItem('pesaroute_theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AuthProvider>
          <AppFrame>{children}</AppFrame>
        </AuthProvider>
      </body>
    </html>
  );
}
