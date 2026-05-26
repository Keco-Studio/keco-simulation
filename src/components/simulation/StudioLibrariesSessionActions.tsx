'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Space, Typography } from 'antd';
import { useAuth } from '@studio/lib/contexts/AuthContext';

type StudioLibrariesSessionActionsProps = {
  /** Navigate here after sign-out (clears project deep links). */
  afterSignOutPath?: string;
};

/**
 * Signed-in account label + sign out for studio-libraries routes.
 */
export function StudioLibrariesSessionActions({
  afterSignOutPath = '/simulation-system/battle/studio-libraries',
}: StudioLibrariesSessionActionsProps) {
  const router = useRouter();
  const { isAuthenticated, isLoading, userProfile, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  if (isLoading || !isAuthenticated || !userProfile) {
    return null;
  }

  const label =
    userProfile.email?.trim() ||
    userProfile.username?.trim() ||
    userProfile.full_name?.trim() ||
    'Signed in';

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.replace(afterSignOutPath);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <Space align="center" size="middle" wrap>
      <Typography.Text type="secondary">{label}</Typography.Text>
      <Button size="small" loading={signingOut} onClick={handleSignOut}>
        Sign out
      </Button>
    </Space>
  );
}
