"use client";

import { SettingsProvider } from "@/components/SettingsProvider";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return <SettingsProvider>{children}</SettingsProvider>;
};
