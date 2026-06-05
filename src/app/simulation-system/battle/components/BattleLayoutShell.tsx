'use client';

import { usePathname } from 'next/navigation';
import { StudioRuntimeProviders } from '@/components/simulation/StudioRuntimeProviders';
import { BattleBreadcrumb } from './BattleBreadcrumb';
import { SimulationSkillDraftsRemoteSync } from './SimulationSkillDraftsRemoteSync';

/**
 * Battle area shell: skills routes use their own breadcrumb, so we skip the battle-only crumb here.
 */
export function BattleLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideBattleCrumb =
    pathname === '/simulation-system/battle' ||
    pathname.startsWith('/simulation-system/battle/skills') ||
    pathname.startsWith('/simulation-system/battle/studio-libraries') ||
    pathname.startsWith('/simulation-system/battle/local-tables');

  return (
    <StudioRuntimeProviders>
      <SimulationSkillDraftsRemoteSync />
      {!hideBattleCrumb && <BattleBreadcrumb />}
      {children}
    </StudioRuntimeProviders>
  );
}
