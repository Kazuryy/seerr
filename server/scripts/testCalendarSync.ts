/**
 * Simple test script for calendar sync
 * Run with: ts-node -r tsconfig-paths/register --project server/tsconfig.json server/scripts/testCalendarSync.ts
 */
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';

async function main() {
  try {
    logger.info('Loading settings...');
    await getSettings().load();

    logger.info('Calendar sync test complete');
    process.exit(0);
  } catch (error) {
    logger.error('Calendar sync test failed', {
      errorMessage: (error as Error).message,
      stack: (error as Error).stack,
    });
    process.exit(1);
  }
}

main();
