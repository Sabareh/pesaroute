import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Learn | PesaRoute",
  description: "Kenya-first investment literacy: assess, learn, practice, apply, and review."
};

// Auth is now provided globally by the root layout, and navigation by the global
// AppFrame, so the learning section no longer renders its own chrome (the old
// inner sidebar/header from LearnChrome is removed). The learn pages don't use
// PageShell, so this container gives them the same gutter as the rest of the app.
export default function LearnLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">{children}</div>;
}
