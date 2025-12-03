import { getRepository } from '@server/datasource';
import {
  DeletionRequest,
  DeletionRequestStatus,
} from '@server/entity/DeletionRequest';
import DeletionService from '@server/lib/deletion';
import type {
  RunnableScanner,
  StatusBase,
} from '@server/lib/scanners/baseScanner';
import { getSettings } from '@server/lib/settings';
import logger from '@server/logger';
import { LessThan } from 'typeorm';

class DeletionVoteProcessor implements RunnableScanner<StatusBase> {
  private running = false;
  private progress = 0;
  private total = 0;
  private deletionService = new DeletionService();

  public async run() {
    const settings = getSettings();

    // Check if deletion feature is enabled
    if (!settings.main.deletion.enabled) {
      logger.debug('Deletion feature is disabled, skipping vote processing', {
        label: 'Deletion Vote Processor',
      });
      return;
    }

    this.running = true;

    try {
      const deletionRequestRepository = getRepository(DeletionRequest);

      // Find all deletion requests with expired voting periods
      const expiredRequests = await deletionRequestRepository.find({
        where: {
          status: DeletionRequestStatus.VOTING,
          votingEndsAt: LessThan(new Date()),
        },
        relations: ['requestedBy', 'processedBy'],
      });

      this.total = expiredRequests.length;

      if (expiredRequests.length === 0) {
        logger.debug('No expired deletion requests to process', {
          label: 'Deletion Vote Processor',
        });
        return;
      }

      logger.info(
        `Processing ${expiredRequests.length} deletion request(s) with expired voting periods`,
        {
          label: 'Deletion Vote Processor',
        }
      );

      // Process each expired request
      for (const request of expiredRequests) {
        if (!this.running) {
          logger.info('Deletion vote processor cancelled', {
            label: 'Deletion Vote Processor',
          });
          break;
        }

        try {
          await this.deletionService.processVotingRequest(request.id);

          logger.info(
            `Processed deletion request ${request.id} (${request.title})`,
            {
              label: 'Deletion Vote Processor',
              deletionRequestId: request.id,
              title: request.title,
              votesFor: request.votesFor,
              votesAgainst: request.votesAgainst,
            }
          );

          this.progress++;
        } catch (error) {
          logger.error(
            `Failed to process deletion request ${request.id} (${request.title})`,
            {
              label: 'Deletion Vote Processor',
              deletionRequestId: request.id,
              title: request.title,
              errorMessage: error.message,
            }
          );
          this.progress++;
        }
      }

      logger.info(
        `Completed processing ${this.progress}/${this.total} deletion requests`,
        {
          label: 'Deletion Vote Processor',
        }
      );
    } catch (error) {
      logger.error('Error in deletion vote processor', {
        label: 'Deletion Vote Processor',
        errorMessage: error.message,
      });
    } finally {
      this.reset();
    }
  }

  public status(): StatusBase {
    return {
      running: this.running,
      progress: this.progress,
      total: this.total,
    };
  }

  public cancel() {
    this.running = false;
  }

  private reset() {
    this.running = false;
    this.progress = 0;
    this.total = 0;
  }
}

const deletionVoteProcessor = new DeletionVoteProcessor();

export default deletionVoteProcessor;
