'use client';

import { StudioRuntimeProviders } from '@/components/simulation/StudioRuntimeProviders';

export default function ProgressionLayout({ children }: { children: React.ReactNode }) {
  return <StudioRuntimeProviders>{children}</StudioRuntimeProviders>;
}
