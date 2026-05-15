'use client';

import { usePathname } from 'next/navigation';
import { BattleBreadcrumb } from './BattleBreadcrumb';

/**
 * Battle area shell: skills routes use their own breadcrumb, so we skip the battle-only crumb here.
 */
export function BattleLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideBattleCrumb =
    pathname.startsWith('/simulation-system/battle/skills') ||
    pathname.startsWith('/simulation-system/battle/studio-libraries') ||
    pathname.startsWith('/simulation-system/battle/local-tables');

  return (
    <>
      {!hideBattleCrumb && <BattleBreadcrumb />}
      {children}
    </>
  );
}
