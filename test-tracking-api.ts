#!/usr/bin/env ts-node
/**
 * Automated API Testing Script for Media Tracking & Reviews
 *
 * Usage:
 *   ts-node -r tsconfig-paths/register --project server/tsconfig.json test-tracking-api.ts
 *
 * Prerequisites:
 *   - Server must be running on http://localhost:5055
 *   - You must be logged in and have a valid session
 *   - At least one media item must exist in the database
 */

import type { AxiosInstance } from 'axios';
import axios, { AxiosError } from 'axios';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:5055';
const API_BASE = `${BASE_URL}/api/v1`;

// Test results tracking
let passedTests = 0;
let failedTests = 0;
const failedTestDetails: string[] = [];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

// Helper functions
function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green);
  passedTests++;
}

function logError(message: string, error?: unknown) {
  log(`✗ ${message}`, colors.red);
  failedTests++;
  let errorDetail = message;
  if (error instanceof AxiosError) {
    errorDetail += `\n  Status: ${
      error.response?.status
    }\n  Response: ${JSON.stringify(error.response?.data, null, 2)}`;
  } else if (error instanceof Error) {
    errorDetail += `\n  Error: ${error.message}`;
  }
  failedTestDetails.push(errorDetail);
}

function logInfo(message: string) {
  log(message, colors.cyan);
}

function logWarning(message: string) {
  log(message, colors.yellow);
}

function logSection(title: string) {
  log(`\n${'='.repeat(60)}`, colors.bright);
  log(title, colors.bright);
  log('='.repeat(60), colors.bright);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual === expected) {
    logSuccess(message);
  } else {
    logError(`${message} (expected: ${expected}, got: ${actual})`);
  }
}

function assertTrue(condition: boolean, message: string) {
  if (condition) {
    logSuccess(message);
  } else {
    logError(message);
  }
}

// API Client
class TrackingAPITester {
  private client: AxiosInstance;
  private sessionCookie: string | null = null;
  private testMediaId: number | null = null;
  private testWatchId: number | null = null;
  private testReviewId: number | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE,
      validateStatus: () => true, // Don't throw on any status
    });
  }

  async setup() {
    logSection('Setup');

    // Try to authenticate
    try {
      logInfo('Attempting to authenticate...');

      // First, try to access a protected route to check if we're already logged in
      const testResponse = await this.client.get('/auth/me');

      if (testResponse.status === 200) {
        logSuccess('Already authenticated');
        // Extract cookie from response if available
        const setCookie = testResponse.headers['set-cookie'];
        if (setCookie && setCookie.length > 0) {
          this.sessionCookie = setCookie[0].split(';')[0];
        }
      } else {
        logWarning('Not authenticated. You must login to Seerr first.');
        logWarning('1. Open http://localhost:5055 in your browser');
        logWarning('2. Login to your account');
        logWarning('3. Inspect cookies and copy the connect.sid value');
        logWarning('4. Set SESSION_COOKIE environment variable:');
        logWarning('   export SESSION_COOKIE="connect.sid=YOUR_COOKIE_VALUE"');
        logWarning('5. Run this script again');

        // Check if SESSION_COOKIE env var is set
        if (process.env.SESSION_COOKIE) {
          this.sessionCookie = process.env.SESSION_COOKIE;
          this.client.defaults.headers.common['Cookie'] = this.sessionCookie;

          // Verify it works
          const verifyResponse = await this.client.get('/auth/me');
          if (verifyResponse.status === 200) {
            logSuccess('Session cookie from environment variable is valid');
          } else {
            logError('Session cookie from environment variable is invalid');
            process.exit(1);
          }
        } else {
          process.exit(1);
        }
      }

      // Set cookie for all requests
      if (this.sessionCookie) {
        this.client.defaults.headers.common['Cookie'] = this.sessionCookie;
      }

      // Find a media item to test with
      logInfo('Finding test media...');
      const mediaResponse = await this.client.get('/media');
      if (
        mediaResponse.status === 200 &&
        mediaResponse.data.results?.length > 0
      ) {
        this.testMediaId = mediaResponse.data.results[0].id;
        logSuccess(`Found test media with ID: ${this.testMediaId}`);
      } else {
        logError('No media found in database. Please add some media first.');
        process.exit(1);
      }
    } catch (error) {
      logError('Setup failed', error);
      process.exit(1);
    }
  }

  async testWatchHistoryEndpoints() {
    logSection('Testing Watch History Endpoints');

    // Test 1: Mark media as watched (POST /tracking/watch)
    try {
      const response = await this.client.post('/tracking/watch', {
        mediaId: this.testMediaId,
        mediaType: 'MOVIE',
      });

      assertEqual(
        response.status,
        201,
        'POST /tracking/watch returns 201 Created'
      );
      assertTrue(!!response.data.id, 'Response contains watch history ID');
      assertTrue(
        !!response.data.watchedAt,
        'Response contains watchedAt timestamp'
      );
      this.testWatchId = response.data.id;
    } catch (error) {
      logError('POST /tracking/watch failed', error);
    }

    // Test 2: Get watch history (GET /tracking/watch)
    try {
      const response = await this.client.get('/tracking/watch?take=20');
      assertEqual(response.status, 200, 'GET /tracking/watch returns 200 OK');
      assertTrue(!!response.data.pageInfo, 'Response contains pageInfo');
      assertTrue(
        Array.isArray(response.data.results),
        'Response contains results array'
      );
      assertTrue(
        response.data.results.length > 0,
        'Results array is not empty'
      );
    } catch (error) {
      logError('GET /tracking/watch failed', error);
    }

    // Test 3: Filter by media type
    try {
      const response = await this.client.get(
        '/tracking/watch?mediaType=MOVIE&take=10'
      );
      assertEqual(
        response.status,
        200,
        'GET /tracking/watch with mediaType filter returns 200'
      );
      if (response.data.results.length > 0) {
        assertTrue(
          response.data.results.every((w: any) => w.mediaType === 'MOVIE'),
          'All results have mediaType=MOVIE'
        );
      }
    } catch (error) {
      logError('GET /tracking/watch with filter failed', error);
    }

    // Test 4: Get watch history for specific media (GET /tracking/watch/:mediaId)
    try {
      const response = await this.client.get(
        `/tracking/watch/${this.testMediaId}`
      );
      assertEqual(
        response.status,
        200,
        'GET /tracking/watch/:mediaId returns 200 OK'
      );
      assertTrue(Array.isArray(response.data), 'Response is an array');
      if (response.data.length > 0) {
        assertTrue(
          response.data.every((w: any) => w.mediaId === this.testMediaId),
          'All results are for the requested media'
        );
      }
    } catch (error) {
      logError('GET /tracking/watch/:mediaId failed', error);
    }

    // Test 5: Pagination
    try {
      const response = await this.client.get('/tracking/watch?take=1&skip=0');
      assertEqual(response.status, 200, 'Pagination works');
      assertEqual(response.data.pageInfo.pageSize, 1, 'Page size is 1');
    } catch (error) {
      logError('Pagination test failed', error);
    }

    // Test 6: Mark TV episode as watched
    try {
      const response = await this.client.post('/tracking/watch', {
        mediaId: this.testMediaId,
        mediaType: 'TV',
        seasonNumber: 1,
        episodeNumber: 1,
      });

      assertEqual(
        response.status,
        201,
        'POST /tracking/watch for TV episode returns 201'
      );
      assertEqual(response.data.seasonNumber, 1, 'Season number is saved');
      assertEqual(response.data.episodeNumber, 1, 'Episode number is saved');
    } catch (error) {
      logError('POST /tracking/watch for TV episode failed', error);
    }
  }

  async testReviewEndpoints() {
    logSection('Testing Review Endpoints');

    // Test 1: Create review (POST /tracking/reviews)
    try {
      const response = await this.client.post('/tracking/reviews', {
        mediaId: this.testMediaId,
        mediaType: 'MOVIE',
        rating: 8,
        content: 'This is an automated test review. Great movie!',
        isPublic: true,
        containsSpoilers: false,
      });

      assertTrue(
        response.status === 201 || response.status === 200,
        'POST /tracking/reviews returns 201 or 200'
      );
      assertTrue(!!response.data.id, 'Response contains review ID');
      assertEqual(response.data.rating, 8, 'Rating is saved correctly');
      this.testReviewId = response.data.id;
    } catch (error) {
      logError('POST /tracking/reviews failed', error);
    }

    // Test 2: Update review (upsert)
    try {
      const response = await this.client.post('/tracking/reviews', {
        mediaId: this.testMediaId,
        mediaType: 'MOVIE',
        rating: 9,
        content: 'Updated review content - even better on rewatch!',
      });

      assertEqual(
        response.status,
        200,
        'POST /tracking/reviews (update) returns 200'
      );
      assertEqual(response.data.rating, 9, 'Rating is updated');
      assertTrue(
        response.data.content.includes('Updated review'),
        'Content is updated'
      );
    } catch (error) {
      logError('POST /tracking/reviews (update) failed', error);
    }

    // Test 3: Get reviews (GET /tracking/reviews)
    try {
      const response = await this.client.get('/tracking/reviews?take=20');
      assertEqual(response.status, 200, 'GET /tracking/reviews returns 200 OK');
      assertTrue(!!response.data.pageInfo, 'Response contains pageInfo');
      assertTrue(
        Array.isArray(response.data.results),
        'Response contains results array'
      );
    } catch (error) {
      logError('GET /tracking/reviews failed', error);
    }

    // Test 4: Filter reviews by media
    try {
      const response = await this.client.get(
        `/tracking/reviews?mediaId=${this.testMediaId}`
      );
      assertEqual(
        response.status,
        200,
        'GET /tracking/reviews with mediaId filter returns 200'
      );
      if (response.data.results.length > 0) {
        assertTrue(
          response.data.results.every(
            (r: any) => r.mediaId === this.testMediaId
          ),
          'All results are for the requested media'
        );
      }
    } catch (error) {
      logError('GET /tracking/reviews with mediaId filter failed', error);
    }

    // Test 5: Get current user's review (GET /tracking/reviews/:mediaId/me)
    try {
      const response = await this.client.get(
        `/tracking/reviews/${this.testMediaId}/me`
      );
      assertEqual(
        response.status,
        200,
        'GET /tracking/reviews/:mediaId/me returns 200'
      );
      assertEqual(
        response.data.mediaId,
        this.testMediaId,
        'Review is for correct media'
      );
      assertEqual(response.data.rating, 9, 'Review has correct rating');
    } catch (error) {
      logError('GET /tracking/reviews/:mediaId/me failed', error);
    }

    // Test 6: Create review with only rating (no content)
    try {
      const response = await this.client.post('/tracking/reviews', {
        mediaId: this.testMediaId,
        mediaType: 'MOVIE',
        rating: 7,
      });

      assertTrue(
        response.status === 200 || response.status === 201,
        'Can create review with only rating'
      );
    } catch (error) {
      logError('POST /tracking/reviews with only rating failed', error);
    }

    // Test 7: Create review for TV season
    try {
      const response = await this.client.post('/tracking/reviews', {
        mediaId: this.testMediaId,
        mediaType: 'TV',
        seasonNumber: 1,
        rating: 8,
        content: 'Great first season!',
      });

      assertTrue(
        response.status === 201 || response.status === 200,
        'Can create review for TV season'
      );
      assertEqual(response.data.seasonNumber, 1, 'Season number is saved');
    } catch (error) {
      logError('POST /tracking/reviews for TV season failed', error);
    }
  }

  async testStatsEndpoint() {
    logSection('Testing Stats Endpoint');

    try {
      // Get current user ID first
      const meResponse = await this.client.get('/auth/me');
      if (meResponse.status !== 200) {
        logError('Could not get current user ID');
        return;
      }

      const userId = meResponse.data.id;
      const response = await this.client.get(`/tracking/stats/${userId}`);

      assertEqual(
        response.status,
        200,
        'GET /tracking/stats/:userId returns 200 OK'
      );
      assertEqual(response.data.userId, userId, 'Stats are for correct user');
      assertTrue(!!response.data.watchStats, 'Response contains watchStats');
      assertTrue(!!response.data.reviewStats, 'Response contains reviewStats');

      // Check watchStats structure
      assertTrue(
        typeof response.data.watchStats.totalWatches === 'number',
        'watchStats.totalWatches is a number'
      );
      assertTrue(
        typeof response.data.watchStats.movieWatches === 'number',
        'watchStats.movieWatches is a number'
      );

      // Check reviewStats structure
      assertTrue(
        typeof response.data.reviewStats.totalReviews === 'number',
        'reviewStats.totalReviews is a number'
      );
      assertTrue(
        Array.isArray(response.data.reviewStats.ratingDistribution),
        'reviewStats.ratingDistribution is an array'
      );

      if (response.data.reviewStats.totalReviews > 0) {
        assertTrue(
          typeof response.data.reviewStats.averageRating === 'number',
          'averageRating is a number when reviews exist'
        );
      }

      logInfo(`Total watches: ${response.data.watchStats.totalWatches}`);
      logInfo(`Total reviews: ${response.data.reviewStats.totalReviews}`);
      if (response.data.reviewStats.averageRating) {
        logInfo(`Average rating: ${response.data.reviewStats.averageRating}`);
      }
    } catch (error) {
      logError('GET /tracking/stats/:userId failed', error);
    }
  }

  async testValidation() {
    logSection('Testing Validation');

    // Test 1: Missing required fields
    try {
      const response = await this.client.post('/tracking/watch', {});
      assertEqual(
        response.status,
        400,
        'Missing required fields returns 400 Bad Request'
      );
      assertTrue(!!response.data.errors, 'Response contains errors array');
    } catch (error) {
      logError('Validation test (missing fields) failed', error);
    }

    // Test 2: Invalid rating (too high)
    try {
      const response = await this.client.post('/tracking/reviews', {
        mediaId: this.testMediaId,
        mediaType: 'MOVIE',
        rating: 15,
      });
      assertEqual(
        response.status,
        400,
        'Invalid rating returns 400 Bad Request'
      );
    } catch (error) {
      logError('Validation test (invalid rating) failed', error);
    }

    // Test 3: Invalid rating (too low)
    try {
      const response = await this.client.post('/tracking/reviews', {
        mediaId: this.testMediaId,
        mediaType: 'MOVIE',
        rating: 0,
      });
      assertEqual(response.status, 400, 'Rating < 1 returns 400 Bad Request');
    } catch (error) {
      logError('Validation test (rating too low) failed', error);
    }

    // Test 4: Review without rating or content
    try {
      const response = await this.client.post('/tracking/reviews', {
        mediaId: this.testMediaId,
        mediaType: 'MOVIE',
      });
      assertEqual(
        response.status,
        400,
        'Review without rating/content returns 400'
      );
    } catch (error) {
      logError('Validation test (no rating/content) failed', error);
    }

    // Test 5: Invalid mediaType
    try {
      const response = await this.client.post('/tracking/watch', {
        mediaId: this.testMediaId,
        mediaType: 'INVALID',
      });
      assertEqual(response.status, 400, 'Invalid mediaType returns 400');
    } catch (error) {
      logError('Validation test (invalid mediaType) failed', error);
    }

    // Test 6: Invalid pagination (take > 100)
    try {
      const response = await this.client.get('/tracking/watch?take=150');
      assertEqual(response.status, 400, 'take > 100 returns 400 Bad Request');
    } catch (error) {
      logError('Validation test (take too large) failed', error);
    }
  }

  async testCleanup() {
    logSection('Cleanup');

    // Delete the test review
    if (this.testReviewId) {
      try {
        const response = await this.client.delete(
          `/tracking/reviews/${this.testReviewId}`
        );
        assertEqual(
          response.status,
          204,
          'DELETE /tracking/reviews/:reviewId returns 204'
        );
      } catch (error) {
        logError('DELETE /tracking/reviews/:reviewId failed', error);
      }
    }

    // Delete the test watch entry
    if (this.testWatchId) {
      try {
        const response = await this.client.delete(
          `/tracking/watch/${this.testWatchId}`
        );
        assertEqual(
          response.status,
          204,
          'DELETE /tracking/watch/:watchId returns 204'
        );
      } catch (error) {
        logError('DELETE /tracking/watch/:watchId failed', error);
      }
    }

    // Verify deletion
    if (this.testWatchId) {
      try {
        const response = await this.client.delete(
          `/tracking/watch/${this.testWatchId}`
        );
        assertEqual(
          response.status,
          404,
          'Deleted watch entry returns 404 on second delete'
        );
      } catch (error) {
        logError('Verification of watch deletion failed', error);
      }
    }
  }

  async printSummary() {
    logSection('Test Summary');

    const total = passedTests + failedTests;
    const passRate =
      total > 0 ? ((passedTests / total) * 100).toFixed(1) : '0.0';

    log(`Total tests: ${total}`, colors.cyan);
    log(`Passed: ${passedTests}`, colors.green);
    log(`Failed: ${failedTests}`, failedTests > 0 ? colors.red : colors.green);
    log(
      `Pass rate: ${passRate}%`,
      passedTests === total ? colors.green : colors.yellow
    );

    if (failedTests > 0) {
      logSection('Failed Tests Details');
      failedTestDetails.forEach((detail, index) => {
        log(`\n${index + 1}. ${detail}`, colors.red);
      });
    }

    log(''); // Empty line
    if (failedTests === 0) {
      log(
        '🎉 All tests passed! The tracking API is working correctly.',
        colors.green
      );
    } else {
      log(
        '⚠️  Some tests failed. Please review the errors above.',
        colors.yellow
      );
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  log('', colors.bright);
  log(
    '╔═══════════════════════════════════════════════════════════╗',
    colors.cyan
  );
  log(
    '║   Media Tracking & Reviews API - Automated Test Suite   ║',
    colors.cyan
  );
  log(
    '╚═══════════════════════════════════════════════════════════╝',
    colors.cyan
  );
  log('', colors.bright);

  const tester = new TrackingAPITester();

  try {
    await tester.setup();
    await tester.testWatchHistoryEndpoints();
    await tester.testReviewEndpoints();
    await tester.testStatsEndpoint();
    await tester.testValidation();
    await tester.testCleanup();
    await tester.printSummary();
  } catch (error) {
    logError('Test suite encountered an unexpected error', error);
    process.exit(1);
  }
}

// Run tests
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
