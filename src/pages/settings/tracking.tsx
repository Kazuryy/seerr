import SettingsLayout from '@app/components/Settings/SettingsLayout';
import SettingsTracking from '@app/components/Settings/SettingsTracking';
import useRouteGuard from '@app/hooks/useRouteGuard';
import { Permission } from '@app/hooks/useUser';
import type { NextPage } from 'next';

const SettingsTrackingPage: NextPage = () => {
  useRouteGuard(Permission.ADMIN);
  return (
    <SettingsLayout>
      <SettingsTracking />
    </SettingsLayout>
  );
};

export default SettingsTrackingPage;
