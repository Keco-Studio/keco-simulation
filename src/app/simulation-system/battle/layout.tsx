import type { Metadata } from 'next';
import { BattleLayoutShell } from './components/BattleLayoutShell';

export const metadata: Metadata = {
  title: 'Battle Simulator - Keco Simulation',
  description: 'Turn-based PVE battle simulation and difficulty tooling',
};

/** Battle routes: shell with shared navigation. */
export default function BattleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <BattleLayoutShell>{children}</BattleLayoutShell>;
}
