import { redirect } from 'next/navigation';

/** Character progression is configured in the battle wizard (step 2). */
export default function ProgressionPage() {
  redirect('/simulation-system/battle');
}
