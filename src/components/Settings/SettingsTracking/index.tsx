import Button from '@app/components/Common/Button';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import globalMessages from '@app/i18n/globalMessages';
import defineMessages from '@app/utils/defineMessages';
import { ArrowDownOnSquareIcon } from '@heroicons/react/24/outline';
import type { TrackingSettings } from '@server/lib/settings';
import axios from 'axios';
import { Field, Form, Formik } from 'formik';
import { useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';
import useSWR from 'swr';
import * as Yup from 'yup';

const messages = defineMessages('components.Settings.SettingsTracking', {
  toastSettingsSuccess: 'Settings saved successfully!',
  toastSettingsFailure: 'Something went wrong while saving settings.',
  tracking: 'Tracking',
  trackingsettings: 'Tracking Settings',
  trackingsettingsDescription:
    'Configure global tracking settings for Jellyfin auto-sync.',
  jellyfinAutoSync: 'Jellyfin Auto-Sync',
  jellyfinAutoSyncDescription:
    'Configure thresholds for automatic watch tracking from Jellyfin.',
  completionThreshold: 'Completion Threshold (%)',
  completionThresholdTip:
    'Percentage of media that must be watched to count as a completed watch.',
  minWatchSeconds: 'Minimum Watch Time (seconds)',
  minWatchSecondsTip:
    'Minimum time spent watching (in seconds) to count as a completed watch.',
  minActivitySeconds: 'Minimum Activity Time (seconds)',
  minActivitySecondsTip:
    'Minimum time spent watching (in seconds) to count as daily activity for streaks.',
  validationThreshold: 'Threshold must be between 0 and 100',
  validationMinWatchSeconds: 'Must be a positive number',
  validationMinActivitySeconds: 'Must be a positive number',
});

const SettingsTracking = () => {
  const { addToast } = useToasts();
  const intl = useIntl();
  const {
    data,
    error,
    mutate: revalidate,
  } = useSWR<TrackingSettings>('/api/v1/settings/tracking');

  const TrackingSettingsSchema = Yup.object().shape({
    completionThreshold: Yup.number()
      .min(0, intl.formatMessage(messages.validationThreshold))
      .max(100, intl.formatMessage(messages.validationThreshold))
      .required(intl.formatMessage(messages.validationThreshold)),
    minWatchSeconds: Yup.number()
      .min(0, intl.formatMessage(messages.validationMinWatchSeconds))
      .required(intl.formatMessage(messages.validationMinWatchSeconds)),
    minActivitySeconds: Yup.number()
      .min(0, intl.formatMessage(messages.validationMinActivitySeconds))
      .required(intl.formatMessage(messages.validationMinActivitySeconds)),
  });

  if (!data && !error) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <PageTitle
        title={[
          intl.formatMessage(messages.tracking),
          intl.formatMessage(globalMessages.settings),
        ]}
      />
      <div className="mb-6">
        <h3 className="heading">
          {intl.formatMessage(messages.trackingsettings)}
        </h3>
        <p className="description">
          {intl.formatMessage(messages.trackingsettingsDescription)}
        </p>
      </div>
      <div className="section">
        <Formik
          initialValues={{
            completionThreshold: data?.jellyfinAutoSync?.completionThreshold ?? 85,
            minWatchSeconds: data?.jellyfinAutoSync?.minWatchSeconds ?? 120,
            minActivitySeconds: data?.jellyfinAutoSync?.minActivitySeconds ?? 60,
          }}
          enableReinitialize
          validationSchema={TrackingSettingsSchema}
          onSubmit={async (values) => {
            try {
              await axios.post('/api/v1/settings/tracking', {
                jellyfinAutoSync: {
                  completionThreshold: Number(values.completionThreshold),
                  minWatchSeconds: Number(values.minWatchSeconds),
                  minActivitySeconds: Number(values.minActivitySeconds),
                },
              });

              addToast(intl.formatMessage(messages.toastSettingsSuccess), {
                autoDismiss: true,
                appearance: 'success',
              });
            } catch (e) {
              addToast(intl.formatMessage(messages.toastSettingsFailure), {
                autoDismiss: true,
                appearance: 'error',
              });
            } finally {
              revalidate();
            }
          }}
        >
          {({ errors, touched, isSubmitting, isValid }) => {
            return (
              <Form className="section" data-testid="settings-tracking-form">
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-white">
                    {intl.formatMessage(messages.jellyfinAutoSync)}
                  </h4>
                  <p className="text-sm text-gray-400">
                    {intl.formatMessage(messages.jellyfinAutoSyncDescription)}
                  </p>
                </div>

                <div className="form-row">
                  <label htmlFor="completionThreshold" className="text-label">
                    {intl.formatMessage(messages.completionThreshold)}
                    <span className="label-tip">
                      {intl.formatMessage(messages.completionThresholdTip)}
                    </span>
                  </label>
                  <div className="form-input-area">
                    <div className="form-input-field">
                      <Field
                        id="completionThreshold"
                        name="completionThreshold"
                        type="text"
                        inputMode="numeric"
                      />
                    </div>
                    {errors.completionThreshold &&
                      touched.completionThreshold &&
                      typeof errors.completionThreshold === 'string' && (
                        <div className="error">{errors.completionThreshold}</div>
                      )}
                  </div>
                </div>

                <div className="form-row">
                  <label htmlFor="minWatchSeconds" className="text-label">
                    {intl.formatMessage(messages.minWatchSeconds)}
                    <span className="label-tip">
                      {intl.formatMessage(messages.minWatchSecondsTip)}
                    </span>
                  </label>
                  <div className="form-input-area">
                    <div className="form-input-field">
                      <Field
                        id="minWatchSeconds"
                        name="minWatchSeconds"
                        type="text"
                        inputMode="numeric"
                      />
                    </div>
                    {errors.minWatchSeconds &&
                      touched.minWatchSeconds &&
                      typeof errors.minWatchSeconds === 'string' && (
                        <div className="error">{errors.minWatchSeconds}</div>
                      )}
                  </div>
                </div>

                <div className="form-row">
                  <label htmlFor="minActivitySeconds" className="text-label">
                    {intl.formatMessage(messages.minActivitySeconds)}
                    <span className="label-tip">
                      {intl.formatMessage(messages.minActivitySecondsTip)}
                    </span>
                  </label>
                  <div className="form-input-area">
                    <div className="form-input-field">
                      <Field
                        id="minActivitySeconds"
                        name="minActivitySeconds"
                        type="text"
                        inputMode="numeric"
                      />
                    </div>
                    {errors.minActivitySeconds &&
                      touched.minActivitySeconds &&
                      typeof errors.minActivitySeconds === 'string' && (
                        <div className="error">{errors.minActivitySeconds}</div>
                      )}
                  </div>
                </div>

                <div className="actions">
                  <div className="flex justify-end">
                    <span className="ml-3 inline-flex rounded-md shadow-sm">
                      <Button
                        buttonType="primary"
                        type="submit"
                        disabled={isSubmitting || !isValid}
                      >
                        <ArrowDownOnSquareIcon />
                        <span>
                          {isSubmitting
                            ? intl.formatMessage(globalMessages.saving)
                            : intl.formatMessage(globalMessages.save)}
                        </span>
                      </Button>
                    </span>
                  </div>
                </div>
              </Form>
            );
          }}
        </Formik>
      </div>
    </>
  );
};

export default SettingsTracking;
