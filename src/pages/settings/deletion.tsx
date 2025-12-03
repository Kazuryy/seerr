import SettingsDeletion from '@app/components/Settings/SettingsDeletion';
import SettingsLayout from '@app/components/Settings/SettingsLayout';
import useRouteGuard from '@app/hooks/useRouteGuard';
import { Permission } from '@app/hooks/useUser';
import type { NextPage } from 'next';

const SettingsDeletionPage: NextPage = () => {
  useRouteGuard(Permission.ADMIN);
  return (
    <SettingsLayout>
      <SettingsDeletion />
    </SettingsLayout>
  );
};

export default SettingsDeletionPage;
