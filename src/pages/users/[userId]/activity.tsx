import UserActivity from '@app/components/UserActivity';
import useRouteGuard from '@app/hooks/useRouteGuard';
import { Permission } from '@app/hooks/useUser';
import type { NextPage } from 'next';

const UserActivityPage: NextPage = () => {
  useRouteGuard([Permission.MANAGE_USERS, Permission.MANAGE_REQUESTS], {
    type: 'or',
  });

  return <UserActivity />;
};

export default UserActivityPage;
