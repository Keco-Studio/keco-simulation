import type { Metadata } from 'next';
import { SimulationStudioBridge } from './SimulationStudioBridge';

export const metadata: Metadata = {
  title: 'Simulation System - Keco Simulation',
  description: 'Economy and battle design-time simulators',
};

/** Root layout segment for every `/simulation-system` route. */
export default function SimulationSystemLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SimulationStudioBridge />
      {children}
    </>
  );
}
