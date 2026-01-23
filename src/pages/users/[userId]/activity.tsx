import UserActivity from '@app/components/UserActivity';
import { Permission, useUser } from '@app/hooks/useUser';
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const UserActivityPage: NextPage = () => {
  const router = useRouter();
  const { user, hasPermission } = useUser();
  const userId = Number(router.query.userId);

  useEffect(() => {
    if (user && userId) {
      const isOwnProfile = user.id === userId;
      const hasAdminAccess = hasPermission(
        [Permission.MANAGE_USERS, Permission.MANAGE_REQUESTS],
        { type: 'or' }
      );

      // Redirect if not own profile and no admin access
      if (!isOwnProfile && !hasAdminAccess) {
        router.push('/');
      }
    }
  }, [user, userId, hasPermission, router]);

  return <UserActivity />;
};

export default UserActivityPage;
