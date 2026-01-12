import { useUser } from '@app/hooks/useUser';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const ActivityRedirectPage: NextPage = () => {
  const { user } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace(`/users/${user.id}/activity`);
    }
  }, [user, router]);

  return null;
};

export default ActivityRedirectPage;
