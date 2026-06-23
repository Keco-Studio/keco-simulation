import { redirect } from 'next/navigation';

/** Character progression lives in the battle wizard (step 2). */
export default function ProgressionSimulateRedirectPage() {
  redirect('/simulation-system/battle');
}
