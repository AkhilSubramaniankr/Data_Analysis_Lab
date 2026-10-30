"use client";

import * as React from "react";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <TopNav />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
