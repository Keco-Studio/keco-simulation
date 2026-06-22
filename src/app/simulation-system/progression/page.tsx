import { redirect } from 'next/navigation';

/** Legacy entry — run simulation lives on /progression/simulate. */
export default function ProgressionPage() {
  redirect('/simulation-system/progression/simulate');
}
