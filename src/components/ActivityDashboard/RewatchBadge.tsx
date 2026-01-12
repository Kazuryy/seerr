import defineMessages from '@app/utils/defineMessages';
import { ArrowPathIcon } from '@heroicons/react/24/solid';
import { useIntl } from 'react-intl';

const messages = defineMessages('components.ActivityDashboard.RewatchBadge', {
  rewatch: 'Rewatch #{count}',
  firstWatch: 'First Watch',
});

interface RewatchBadgeProps {
  watchCount: number;
}

const RewatchBadge = ({ watchCount }: RewatchBadgeProps) => {
  const intl = useIntl();

  if (watchCount <= 1) {
    return null;
  }

  return (
    <span className="inline-flex items-center space-x-1 rounded-full bg-indigo-900 bg-opacity-50 px-2 py-0.5 text-xs font-medium text-indigo-300">
      <ArrowPathIcon className="h-3 w-3" />
      <span>{intl.formatMessage(messages.rewatch, { count: watchCount })}</span>
    </span>
  );
};

export default RewatchBadge;
