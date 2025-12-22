import AvailableMovies from '@app/components/Available/AvailableMovies';
import type { NextPage } from 'next';

const AvailableMoviesPage: NextPage = () => {
  return (
    <div className="px-4 py-6">
      <AvailableMovies />
    </div>
  );
};

export default AvailableMoviesPage;
