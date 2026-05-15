import type { Metadata } from 'next';
import { BattleSkillsBreadcrumb } from '../components/BattleSkillsBreadcrumb';

export const metadata: Metadata = {
  title: 'Battle skills sheet - Keco Simulation',
  description: 'Edit battle simulator skills; data stays in this browser',
};

export default function BattleSkillsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BattleSkillsBreadcrumb />
      {children}
    </>
  );
}
