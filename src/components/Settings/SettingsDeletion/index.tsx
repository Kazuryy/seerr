import Button from '@app/components/Common/Button';
import LoadingSpinner from '@app/components/Common/LoadingSpinner';
import PageTitle from '@app/components/Common/PageTitle';
import globalMessages from '@app/i18n/globalMessages';
import defineMessages from '@app/utils/defineMessages';
import { ArrowDownOnSquareIcon } from '@heroicons/react/24/outline';
import type { MainSettings } from '@server/lib/settings';
import axios from 'axios';
import { Field, Form, Formik } from 'formik';
import { useIntl } from 'react-intl';
import { useToasts } from 'react-toast-notifications';
import useSWR from 'swr';
import * as Yup from 'yup';

const messages = defineMessages('components.Settings.SettingsDeletion', {
  deletionVoting: 'Deletion Voting',
  deletionVotingDescription:
    'Configure settings for the deletion voting feature. This allows users to request the removal of available media through a voting process.',
  enableDeletionFeature: 'Enable Deletion Voting',
  enableDeletionFeatureTip:
    'Allow users to request deletion of available media. When disabled, the deletion feature will not be accessible.',
  allowNonAdminRequests: 'Allow Non-Admin Deletion Requests',
  allowNonAdminRequestsTip:
    'When enabled, all users can request deletions. When disabled, only administrators can request deletions.',
  votingDuration: 'Voting Duration (Hours)',
  votingDurationTip:
    'How long the voting period lasts before a deletion request is automatically processed.',
  requiredVotePercentage: 'Required Vote Percentage',
  requiredVotePercentageTip:
    'The minimum percentage of approval votes required for a deletion to be approved (0-100).',
  autoDeleteOnApproval: 'Auto-Delete on Approval',
  autoDeleteOnApprovalTip:
    'Automatically delete media when a deletion request is approved. When disabled, approved deletions must be processed manually.',
  discordRoleId: 'Discord Role ID to Mention',
  discordRoleIdTip:
    'Optional Discord role ID to mention when deletion voting starts. Leave empty to use @everyone. To get a role ID: Server Settings → Roles → Right-click role → Copy ID (requires Developer Mode)',
  toastSettingsSuccess: 'Deletion settings saved successfully!',
  toastSettingsFailure: 'Something went wrong while saving deletion settings.',
  validationVotingDuration: 'Voting duration must be at least 1 hour',
  validationVotePercentage: 'Vote percentage must be between 0 and 100',
});

const SettingsDeletion = () => {
  const { addToast } = useToasts();
  const intl = useIntl();
  const {
    data,
    error,
    mutate: revalidate,
  } = useSWR<MainSettings>('/api/v1/settings/main');

  const DeletionSettingsSchema = Yup.object().shape({
    votingDurationHours: Yup.number()
      .min(1, intl.formatMessage(messages.validationVotingDuration))
      .required(intl.formatMessage(messages.validationVotingDuration)),
    requiredVotePercentage: Yup.number()
      .min(0, intl.formatMessage(messages.validationVotePercentage))
      .max(100, intl.formatMessage(messages.validationVotePercentage))
      .required(intl.formatMessage(messages.validationVotePercentage)),
  });

  if (!data && !error) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <PageTitle
        title={[
          intl.formatMessage(messages.deletionVoting),
          intl.formatMessage(globalMessages.settings),
        ]}
      />
      <div className="mb-6">
        <h3 className="heading">
          {intl.formatMessage(messages.deletionVoting)}
        </h3>
        <p className="description">
          {intl.formatMessage(messages.deletionVotingDescription)}
        </p>
      </div>
      <div className="section">
        <Formik
          initialValues={{
            enabled: data?.deletion?.enabled ?? false,
            allowNonAdminDeletionRequests:
              data?.deletion?.allowNonAdminDeletionRequests ?? false,
            votingDurationHours: data?.deletion?.votingDurationHours ?? 48,
            requiredVotePercentage:
              data?.deletion?.requiredVotePercentage ?? 60,
            autoDeleteOnApproval: data?.deletion?.autoDeleteOnApproval ?? false,
            discordRoleId: data?.deletion?.discordRoleId ?? '',
          }}
          enableReinitialize
          validationSchema={DeletionSettingsSchema}
          onSubmit={async (values) => {
            try {
              await axios.post('/api/v1/settings/main', {
                deletion: {
                  enabled: values.enabled,
                  allowNonAdminDeletionRequests:
                    values.allowNonAdminDeletionRequests,
                  votingDurationHours: values.votingDurationHours,
                  requiredVotePercentage: values.requiredVotePercentage,
                  autoDeleteOnApproval: values.autoDeleteOnApproval,
                  discordRoleId: values.discordRoleId.trim() || undefined,
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
          {({
            errors,
            touched,
            isSubmitting,
            isValid,
            values,
            setFieldValue,
          }) => {
            return (
              <Form className="section">
                <div className="form-row">
                  <label htmlFor="enabled" className="checkbox-label">
                    <span className="mr-2">
                      {intl.formatMessage(messages.enableDeletionFeature)}
                    </span>
                    <span className="label-tip">
                      {intl.formatMessage(messages.enableDeletionFeatureTip)}
                    </span>
                  </label>
                  <div className="form-input-area">
                    <Field
                      type="checkbox"
                      id="enabled"
                      name="enabled"
                      onChange={() => {
                        setFieldValue('enabled', !values.enabled);
                      }}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <label
                    htmlFor="allowNonAdminDeletionRequests"
                    className="checkbox-label"
                  >
                    <span className="mr-2">
                      {intl.formatMessage(messages.allowNonAdminRequests)}
                    </span>
                    <span className="label-tip">
                      {intl.formatMessage(messages.allowNonAdminRequestsTip)}
                    </span>
                  </label>
                  <div className="form-input-area">
                    <Field
                      type="checkbox"
                      id="allowNonAdminDeletionRequests"
                      name="allowNonAdminDeletionRequests"
                      onChange={() => {
                        setFieldValue(
                          'allowNonAdminDeletionRequests',
                          !values.allowNonAdminDeletionRequests
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <label htmlFor="votingDurationHours" className="text-label">
                    <span>{intl.formatMessage(messages.votingDuration)}</span>
                    <span className="label-tip">
                      {intl.formatMessage(messages.votingDurationTip)}
                    </span>
                  </label>
                  <div className="form-input-area">
                    <Field
                      id="votingDurationHours"
                      name="votingDurationHours"
                      type="text"
                      inputMode="numeric"
                      className="short"
                      placeholder="48"
                    />
                    {errors.votingDurationHours &&
                      touched.votingDurationHours &&
                      typeof errors.votingDurationHours === 'string' && (
                        <div className="error">
                          {errors.votingDurationHours}
                        </div>
                      )}
                  </div>
                </div>
                <div className="form-row">
                  <label
                    htmlFor="requiredVotePercentage"
                    className="text-label"
                  >
                    <span>
                      {intl.formatMessage(messages.requiredVotePercentage)}
                    </span>
                    <span className="label-tip">
                      {intl.formatMessage(messages.requiredVotePercentageTip)}
                    </span>
                  </label>
                  <div className="form-input-area">
                    <Field
                      id="requiredVotePercentage"
                      name="requiredVotePercentage"
                      type="text"
                      inputMode="numeric"
                      className="short"
                      placeholder="60"
                    />
                    {errors.requiredVotePercentage &&
                      touched.requiredVotePercentage &&
                      typeof errors.requiredVotePercentage === 'string' && (
                        <div className="error">
                          {errors.requiredVotePercentage}
                        </div>
                      )}
                  </div>
                </div>
                <div className="form-row">
                  <label
                    htmlFor="autoDeleteOnApproval"
                    className="checkbox-label"
                  >
                    <span className="mr-2">
                      {intl.formatMessage(messages.autoDeleteOnApproval)}
                    </span>
                    <span className="label-tip">
                      {intl.formatMessage(messages.autoDeleteOnApprovalTip)}
                    </span>
                  </label>
                  <div className="form-input-area">
                    <Field
                      type="checkbox"
                      id="autoDeleteOnApproval"
                      name="autoDeleteOnApproval"
                      onChange={() => {
                        setFieldValue(
                          'autoDeleteOnApproval',
                          !values.autoDeleteOnApproval
                        );
                      }}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <label htmlFor="discordRoleId" className="text-label">
                    <span>{intl.formatMessage(messages.discordRoleId)}</span>
                    <span className="label-tip">
                      {intl.formatMessage(messages.discordRoleIdTip)}
                    </span>
                  </label>
                  <div className="form-input-area">
                    <Field
                      id="discordRoleId"
                      name="discordRoleId"
                      type="text"
                      placeholder="1234567890123456789"
                    />
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

export default SettingsDeletion;
