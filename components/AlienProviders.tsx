"use client";

import { AlienProvider } from "@alien_org/react";

export default function AlienProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AlienProvider>{children}</AlienProvider>;
}
