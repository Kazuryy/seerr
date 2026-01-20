# Jellyfin Auto-Sync Strategy

## Overview

This document outlines the strategy for automatically syncing watch history from Jellyfin to Seerr, inspired by [Jellystat](https://github.com/CyferShepard/Jellystat) but simplified for our use case.

**Goal:** Track user watch activity from Jellyfin automatically, without requiring manual "Mark as Watched" actions.

---

## Architecture Decision

### Chosen Approach: Session Polling (Jellystat-style)

We chose **polling active sessions** over other approaches because:

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| **Session Polling** | No plugin required, real-time, proven by Jellystat | Requires continuous polling | ✅ Chosen |
| **Webhook Plugin** | True real-time, event-driven | Requires user to install plugin | ❌ Too complex for users |
| **IsPlayed Filter** | Simple API call | [LastPlayedDate bug](https://github.com/jellyfin/jellyfin/issues/11186), no timestamp accuracy | ❌ Unreliable |
| **Playback Reporting Plugin** | Historical data | Requires plugin, separate DB | ❌ Extra dependency |

---

## How Jellystat Works (Reference)

### Session Monitoring Architecture

```
Jellyfin Server
      │
      │ GET /sessions (every 1-5 sec)
      ▼
┌─────────────────────────────────────────────────────┐
│ ActivityMonitor.js                                  │
│                                                     │
│  ┌─────────────────┐    ┌─────────────────────────┐│
│  │ jf_activity_    │───▶│ Compare sessions        ││
│  │ watchdog        │    │ Detect start/stop/pause ││
│  │ (live sessions) │    └───────────┬─────────────┘│
│  └─────────────────┘                │              │
│                                     ▼              │
│                      ┌─────────────────────────────┐│
│                      │ jf_playback_activity       ││
│                      │ (completed playbacks)      ││
│                      └─────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

### Key Jellystat Implementation Details

**File:** `backend/tasks/ActivityMonitor.js`

1. **Adaptive Polling:**
   - Active sessions: Poll every 1 second
   - Idle mode: Poll every 5 seconds

2. **State Detection:**
   - New session → Insert into watchdog
   - Session gone → Calculate duration, move to activity
   - Pause state change → Update duration

3. **Duration Calculation:**
   - Tracks start time, pause events
   - Accumulates total watch time across pause/resume cycles

**File:** `backend/classes/jellyfin-api.js`

```javascript
// Jellyfin 10.11+ uses WebSocket
ws://jellyfin-host/socket

// Older versions use REST
GET /sessions
Authorization: MediaBrowser Token="API_KEY"
```

---

## Seerr Implementation Strategy

### Simplified Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    JELLYFIN SERVER                          │
│                                                             │
│  GET /sessions                                              │
│  Response: [{ UserId, NowPlayingItem, PlayState, ... }]     │
└─────────────────────────┬───────────────────────────────────┘
                          │ Poll every 10 seconds
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    SEERR BACKEND                            │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ JellyfinActivityMonitor (new service)                │  │
│  │                                                      │  │
│  │  activeSessions: Map<sessionId, SessionData>        │  │
│  │  (in-memory only - no DB table needed)              │  │
│  └──────────────────────────┬───────────────────────────┘  │
│                             │                               │
│                             │ On playback complete          │
│                             │ (>85% or explicit stop)       │
│                             ▼                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ WatchHistory entity (existing)                       │  │
│  │ + badgeService.checkAndAwardBadges()                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Key Differences from Jellystat

| Aspect | Jellystat | Seerr (Proposed) |
|--------|-----------|------------------|
| Live sessions storage | PostgreSQL table | In-memory Map |
| Polling frequency | 1-5 sec adaptive | 10 sec fixed |
| Playback activity storage | Separate table | Existing WatchHistory |
| User scope | All Jellyfin users | Only linked Seerr users |
| Badge integration | None | Automatic |

---

## Implementation Plan

### Phase 1: Core Service

**New file:** `server/lib/jellyfinActivityMonitor.ts`

```typescript
interface ActiveSession {
  sessionId: string;
  seerrUserId: number;
  jellyfinUserId: string;
  mediaId: number;           // Seerr media ID
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  seasonNumber?: number;
  episodeNumber?: number;
  startedAt: Date;
  lastSeenAt: Date;
  positionTicks: number;
  runtimeTicks: number;
  isPaused: boolean;
}

class JellyfinActivityMonitor {
  private activeSessions: Map<string, ActiveSession> = new Map();
  private pollingInterval: NodeJS.Timeout | null = null;

  async start(): Promise<void>;
  async stop(): Promise<void>;
  private async pollSessions(): Promise<void>;
  private async processSessionStart(session: JellyfinSession): Promise<void>;
  private async processSessionEnd(session: ActiveSession): Promise<void>;
  private isPlaybackComplete(session: ActiveSession): boolean;
  private async createWatchHistoryEntry(session: ActiveSession): Promise<void>;
}
```

### Phase 2: API Extension

**Extend:** `server/api/jellyfin.ts`

```typescript
// Add method to get active sessions
async getSessions(): Promise<JellyfinSession[]> {
  const response = await this.get<JellyfinSession[]>('/sessions');
  return response.filter(s => s.NowPlayingItem); // Only active playback
}
```

### Phase 3: User Settings

**New fields in User entity:**

```typescript
@Column({ default: false })
jellyfinAutoSync: boolean;

@Column({ default: 85 })
jellyfinAutoSyncThreshold: number; // % watched to count as complete

@Column({ default: 120 })
jellyfinAutoSyncMinSeconds: number; // Minimum watch time
```

### Phase 4: Scheduled Job

**Add to:** `server/job/schedule.ts`

```typescript
'jellyfin-activity-monitor': {
  schedule: null, // Continuous polling, not cron
  default: true,
}
```

---

## Data Flow

### Session Start Detection

```
1. Poll /sessions returns new session
2. Check if UserId has linked Seerr account
3. Resolve NowPlayingItem to Seerr Media (via TMDB/TVDB IDs)
4. Add to activeSessions Map
```

### Session End Detection

```
1. Poll /sessions - session no longer present
2. OR session.PlayState.IsPaused for extended period
3. Calculate watch percentage: positionTicks / runtimeTicks
4. If >= threshold (85%):
   - Create WatchHistory entry
   - Trigger badgeService.checkAndAwardBadges()
5. Remove from activeSessions Map
```

### Deduplication Rules

```typescript
// Prevent duplicate entries for same media on same day
const existingToday = await watchHistoryRepo.findOne({
  where: {
    userId,
    mediaId,
    seasonNumber,
    episodeNumber,
    watchedAt: Between(startOfDay, endOfDay)
  }
});

if (existingToday) {
  // Update existing entry instead of creating new one
  existingToday.watchedAt = new Date();
  await watchHistoryRepo.save(existingToday);
} else {
  // Create new entry
  await watchHistoryRepo.save(newEntry);
}
```

---

## Database Impact Analysis

### Estimated Growth

| Scenario | Users | Watches/user/day | Entries/month |
|----------|-------|------------------|---------------|
| Small | 5 | 2 | 300 |
| Medium | 20 | 3 | 1,800 |
| Large | 100 | 5 | 15,000 |

### Mitigation Strategies

1. **Daily deduplication** - Same media + same day = update, not insert
2. **Minimum watch time** - Ignore sessions < 2 minutes (zapping)
3. **Completion threshold** - Only store if watched > 85%
4. **Optional cleanup job** - Archive entries older than X months

---

## Configuration

### Settings UI

```
Jellyfin Auto-Sync Settings
├── Enable auto-sync from Jellyfin [Toggle]
├── Completion threshold: [85]%
├── Minimum watch time: [120] seconds
└── Sync status: [Active / Paused / Error]
```

### Environment Variables

```env
# Optional: Override default polling interval (milliseconds)
JELLYFIN_ACTIVITY_POLL_INTERVAL=10000

# Optional: Disable auto-sync globally
JELLYFIN_ACTIVITY_MONITOR_ENABLED=true
```

---

## Jellyfin API Reference

### GET /sessions

**Authentication:**
```
Authorization: MediaBrowser Token="API_KEY"
```

**Response (simplified):**
```json
[
  {
    "Id": "session-uuid",
    "UserId": "jellyfin-user-uuid",
    "UserName": "john",
    "DeviceId": "device-uuid",
    "DeviceName": "Living Room TV",
    "Client": "Jellyfin Web",
    "NowPlayingItem": {
      "Id": "item-uuid",
      "Name": "Inception",
      "Type": "Movie",
      "RunTimeTicks": 88200000000,
      "ProviderIds": {
        "Tmdb": "27205",
        "Imdb": "tt1375666"
      },
      "SeriesId": null,
      "SeasonId": null,
      "IndexNumber": null,
      "ParentIndexNumber": null
    },
    "PlayState": {
      "PositionTicks": 44100000000,
      "IsPaused": false,
      "PlayMethod": "DirectPlay"
    },
    "LastActivityDate": "2024-01-15T20:30:00.000Z"
  }
]
```

### Key Fields

| Field | Description |
|-------|-------------|
| `NowPlayingItem.ProviderIds.Tmdb` | TMDB ID for media lookup |
| `NowPlayingItem.RunTimeTicks` | Total runtime (1 tick = 100 nanoseconds) |
| `PlayState.PositionTicks` | Current playback position |
| `PlayState.IsPaused` | Pause state |
| `NowPlayingItem.Type` | "Movie", "Episode", "Series" |
| `NowPlayingItem.SeriesId` | Parent series for episodes |
| `NowPlayingItem.IndexNumber` | Episode number |
| `NowPlayingItem.ParentIndexNumber` | Season number |

### Ticks Conversion

```typescript
// Convert ticks to seconds
const seconds = ticks / 10_000_000;

// Convert ticks to percentage
const percentage = (positionTicks / runtimeTicks) * 100;
```

---

## References & Sources

### Jellystat (Primary Reference)
- **Repository:** https://github.com/CyferShepard/Jellystat
- **Activity Monitor:** `backend/tasks/ActivityMonitor.js`
- **Jellyfin API Client:** `backend/classes/jellyfin-api.js`
- **Playback Activity Model:** `backend/models/jf_playback_activity.js`
- **Watchdog Model:** `backend/models/jf_activity_watchdog.js`
- **Sync Logic:** `backend/routes/sync.js`

### Jellyfin API Documentation
- **Official Docs:** https://api.jellyfin.org
- **API Overview:** https://jmshrv.com/posts/jellyfin-api/
- **Swagger UI:** `{jellyfin-host}/api-docs/swagger/index.html`

### Known Issues
- **LastPlayedDate Bug:** https://github.com/jellyfin/jellyfin/issues/11186
  - Jellyfin doesn't update LastPlayedDate reliably when marking as watched
  - This is why we use session polling instead of IsPlayed filter

- **UserData API Key Issue:** https://github.com/jellyfin/jellyfin/issues/11408
  - UserData not included when using API key auth
  - Workaround: Use user token for user-specific queries

### Alternative Approaches (Not Chosen)
- **Webhook Plugin:** https://github.com/jellyfin/jellyfin-plugin-webhook
  - Good for real-time events but requires plugin installation

- **Playback Reporting Plugin:** https://github.com/jellyfin/jellyfin-plugin-playbackreporting
  - Good for historical data but separate database

### Related Projects
- **Streamystats:** https://github.com/fredrikburmester/streamystats
  - Modern alternative to Jellystat

---

## Future Enhancements

### Phase 5: WebSocket Support (Optional)
For Jellyfin 10.11+, use WebSocket instead of polling:

```typescript
// WebSocket connection for real-time updates
const ws = new WebSocket('ws://jellyfin-host/socket');
ws.on('message', (data) => {
  const event = JSON.parse(data);
  if (event.MessageType === 'Sessions') {
    this.processSessionUpdate(event.Data);
  }
});
```

### Phase 6: Historical Import (Optional)
One-time import from Playback Reporting Plugin for users who have it installed.

### Phase 7: Multi-Server Support (Optional)
Support multiple Jellyfin servers with server ID tracking.

---

## Checklist

- [ ] Create `JellyfinActivityMonitor` service
- [ ] Add `getSessions()` method to Jellyfin API client
- [ ] Add user settings fields for auto-sync
- [ ] Create settings UI component
- [ ] Add scheduled job for polling
- [ ] Implement deduplication logic
- [ ] Add badge integration on auto-sync
- [ ] Write tests
- [ ] Documentation

---

*Document created: January 2025*
*Last updated: January 2025*
