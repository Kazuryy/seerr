import Alert from '@app/components/Common/Alert';
import Button from '@app/components/Common/Button';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import { useUser } from '@app/hooks/useUser';
import defineMessages from '@app/utils/defineMessages';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import { useRouter } from 'next/router';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import useSWR from 'swr';

const messages = defineMessages(
  'components.UserProfile.UserSettings.JellyfinAutoSyncSettings',
  {
    autoSyncTitle: 'Jellyfin Auto-Sync',
    autoSyncDescription:
      'Automatically sync your watch history from Jellyfin. When enabled, any media you watch on Jellyfin will be automatically tracked here.',
    enabled: 'Enable Auto-Sync',
    enabledDescription:
      'When enabled, your Jellyfin watch activity will be automatically synced.',
    notLinked:
      'You must link your Jellyfin account before enabling auto-sync.',
    saveSuccess: 'Auto-sync settings saved successfully.',
    saveError: 'Failed to save auto-sync settings.',
    saving: 'Saving...',
    save: 'Save Changes',
  }
);

interface AutoSyncSettings {
  enabled: boolean;
  isLinked: boolean;
}

const JellyfinAutoSyncSettings = () => {
  const intl = useIntl();
  const router = useRouter();
  const { user: currentUser } = useUser();
  const { user } = useUser({ id: Number(router.query.userId) });

  const {
    data: settings,
    error,
    mutate,
  } = useSWR<AutoSyncSettings>(
    user ? `/api/v1/user/${user.id}/settings/jellyfin-autosync` : null
  );

  const [localEnabled, setLocalEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'info' | 'error';
    text: string;
  } | null>(null);

  if (!settings && !error) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <Alert title="Failed to load auto-sync settings" type="error" />;
  }

  const enabled = localEnabled ?? settings?.enabled ?? false;

  const hasChanges = enabled !== settings?.enabled;

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      await axios.post(`/api/v1/user/${user?.id}/settings/jellyfin-autosync`, {
        enabled,
      });

      await mutate();

      // Reset local state
      setLocalEnabled(null);

      setSaveMessage({
        type: 'info',
        text: intl.formatMessage(messages.saveSuccess),
      });
    } catch {
      setSaveMessage({
        type: 'error',
        text: intl.formatMessage(messages.saveError),
      });
    } finally {
      setSaving(false);
    }
  };

  // Only show to the user themselves
  if (currentUser?.id !== user?.id) {
    return null;
  }

  return (
    <div className="mt-8">
      <div className="mb-6">
        <h3 className="heading flex items-center gap-2">
          <ArrowPathIcon className="h-6 w-6" />
          {intl.formatMessage(messages.autoSyncTitle)}
        </h3>
        <p className="description">
          {intl.formatMessage(messages.autoSyncDescription)}
        </p>
      </div>

      {saveMessage && (
        <div className="mb-4">
          <Alert title={saveMessage.text} type={saveMessage.type} />
        </div>
      )}

      {!settings?.isLinked ? (
        <Alert title={intl.formatMessage(messages.notLinked)} type="warning" />
      ) : (
        <div className="space-y-6">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between rounded-lg bg-gray-800 bg-opacity-50 p-4">
            <div>
              <div className="font-medium text-white">
                {intl.formatMessage(messages.enabled)}
              </div>
              <div className="text-sm text-gray-400">
                {intl.formatMessage(messages.enabledDescription)}
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setLocalEnabled(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-gray-600 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-800"></div>
              <span className="sr-only">
                {intl.formatMessage(messages.enabled)}
              </span>
            </label>
          </div>

          {/* Save Button */}
          {hasChanges && (
            <div className="flex justify-end">
              <Button
                buttonType="primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? intl.formatMessage(messages.saving)
                  : intl.formatMessage(messages.save)}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JellyfinAutoSyncSettings;
