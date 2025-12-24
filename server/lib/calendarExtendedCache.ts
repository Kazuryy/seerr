import logger from '@server/logger';

interface ExtendedCacheEntry {
  data: unknown[];
  timestamp: Date;
  ttl: number;
}

class CalendarExtendedCache {
  private cache: Map<string, ExtendedCacheEntry> = new Map();
  private readonly DEFAULT_TTL = 1800; // 30 minutes in seconds

  getCacheKey(start: Date, end: Date, source: 'radarr' | 'sonarr'): string {
    const startStr = start.toISOString().split('T')[0];
    const endStr = end.toISOString().split('T')[0];
    return `${source}_${startStr}_${endStr}`;
  }

  get(start: Date, end: Date, source: 'radarr' | 'sonarr'): unknown[] | null {
    const key = this.getCacheKey(start, end, source);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const age = (Date.now() - entry.timestamp.getTime()) / 1000;
    if (age > entry.ttl) {
      logger.debug(`Extended cache expired: ${key} (${Math.floor(age)}s)`, {
        label: 'Extended Cache',
      });
      this.cache.delete(key);
      return null;
    }

    logger.debug(`Extended cache hit: ${key} (age: ${Math.floor(age)}s)`, {
      label: 'Extended Cache',
    });
    return entry.data;
  }

  set(
    start: Date,
    end: Date,
    source: 'radarr' | 'sonarr',
    data: unknown[]
  ): void {
    const key = this.getCacheKey(start, end, source);
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl: this.DEFAULT_TTL,
    });
    logger.debug(`Extended cache set: ${key} (${data.length} items)`, {
      label: 'Extended Cache',
    });
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    logger.info(`Extended cache cleared (${size} entries)`, {
      label: 'Extended Cache',
    });
  }

  startCleanupTimer(): void {
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, entry] of this.cache.entries()) {
        const age = (now - entry.timestamp.getTime()) / 1000;
        if (age > entry.ttl) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.debug(
          `Extended cache cleanup: ${cleaned} expired entries removed`,
          {
            label: 'Extended Cache',
          }
        );
      }
    }, 600000); // 10 minutes
  }
}

export const calendarExtendedCache = new CalendarExtendedCache();

// Start cleanup timer on import
calendarExtendedCache.startCleanupTimer();
