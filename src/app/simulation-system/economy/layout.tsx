import type { Metadata } from 'next';
import { EconomyBreadcrumb } from './components/EconomyBreadcrumb';

export const metadata: Metadata = {
  title: 'Economy Simulator - Keco Simulation',
  description: 'Economy loops: characters, equipment, arena, stages, and income',
};

/** Economy routes: shared breadcrumb above child pages. */
export default function EconomyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <EconomyBreadcrumb />
      {children}
    </>
  );
}
