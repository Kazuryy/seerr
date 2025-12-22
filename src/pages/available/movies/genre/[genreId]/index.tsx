import AvailableMoviesGenre from '@app/components/Available/AvailableMoviesGenre';
import type { NextPage } from 'next';

const AvailableMoviesGenrePage: NextPage = () => {
  return (
    <div className="px-4 py-6">
      <AvailableMoviesGenre />
    </div>
  );
};

export default AvailableMoviesGenrePage;
