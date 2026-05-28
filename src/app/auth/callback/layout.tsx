import { StudioRuntimeProviders } from '@/components/simulation/StudioRuntimeProviders';

export default function AuthCallbackLayout({ children }: { children: React.ReactNode }) {
  return <StudioRuntimeProviders>{children}</StudioRuntimeProviders>;
}
