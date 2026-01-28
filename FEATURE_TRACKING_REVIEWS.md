# Feature: Media Tracking & Reviews System

## 🎯 Vue d'ensemble

Un système de tracking personnel + social à la Letterboxd/Trakt.tv intégré directement dans Seerr. Cette feature permet aux utilisateurs de :

- Tracker ce qu'ils regardent (films/séries/épisodes)
- Noter les médias (1-10)
- Écrire des reviews avec spoiler tags
- Consulter l'historique complet de visionnage (rewatches inclus)
- Voir les reviews de la communauté
- Générer des stats personnelles et communautaires
- Système de badges/tags pour gamification communautaire

---

## 📊 Décisions clés

### Système de notation

- **Note sur 10** (comme IMDb) - format : `1-10`
- Affichage visuel : ⭐⭐⭐⭐⭐⭐⭐⭐☆☆ (8/10)

### Granularité du tracking

#### Films

- ✅ Vu / ⭐ Note / 💬 Review

#### Séries (3 niveaux)

1. **Niveau Série** : Note globale + review de la série entière
2. **Niveau Saison** : Track "Saison complétée" + note optionnelle
3. **Niveau Épisode** : Chaque épisode marqué "vu" + note optionnelle

**Flexibilité** :

- Utilisateur pressé : marque juste "Saison 1 vue" → tous les épisodes passent en "vu"
- Utilisateur précis : coche épisode par épisode

### Features principales

- ✅ **Historique complet** - tracking de tous les visionnages (rewatches inclus)
- ✅ **Tag spoiler** avec blur automatique du contenu
- ✅ **Privacy par choix** - l'user décide review publique/privée lors de la création
- ✅ **Dashboard centralisé** - page `/activity` avec onglets
- ✅ **Système de badges/tags** - gamification et communauté
- ✅ **Pages profil publiques** - possibilité de voir l'activité des autres users

---

## 💾 Modèle de données

### Entité : `WatchHistory`

Tracking complet de tous les visionnages (rewatches inclus)

```typescript
@Entity()
export class WatchHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.watchHistory)
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Media, (media) => media.watchHistory)
  media: Media;

  @Column()
  mediaId: number;

  @Column({ type: 'varchar' })
  mediaType: 'MOVIE' | 'TV';

  // Pour les séries
  @Column({ nullable: true })
  seasonNumber?: number;

  @Column({ nullable: true })
  episodeNumber?: number;

  // Timestamp précis du visionnage
  @Column({ type: 'datetime' })
  watchedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

**Index** : `(userId, mediaId, watchedAt)` pour queries rapides
**Pas de unique constraint** → permet plusieurs entrées pour le même média (rewatches)

---

### Entité : `MediaReview`

Note + review avec metadata

```typescript
@Entity()
export class MediaReview {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.reviews)
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Media, (media) => media.reviews)
  media: Media;

  @Column()
  mediaId: number;

  @Column({ type: 'varchar' })
  mediaType: 'MOVIE' | 'TV';

  // Pour reviews de saisons spécifiques
  @Column({ nullable: true })
  seasonNumber?: number;

  // Contenu
  @Column({ nullable: true, type: 'int' })
  rating?: number; // 1-10, nullable si review sans note

  @Column({ nullable: true, type: 'text' })
  content?: string; // Texte de la review

  // Métadonnées
  @Column({ default: false })
  containsSpoilers: boolean;

  @Column({ default: true })
  isPublic: boolean;

  // Context
  @Column({ nullable: true, type: 'datetime' })
  watchedAt?: Date; // Optionnel: quand regardé

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => ReviewLike, (like) => like.review)
  likes: ReviewLike[];

  @OneToMany(() => ReviewComment, (comment) => comment.review)
  comments: ReviewComment[];
}
```

**Unique constraint** : `(userId, mediaId, seasonNumber)`
→ Une seule review par user par média/saison (mais peut être updated)

---

### Entité : `ReviewLike`

Likes sur les reviews (feature sociale)

```typescript
@Entity()
export class ReviewLike {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.reviewLikes)
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => MediaReview, (review) => review.likes)
  review: MediaReview;

  @Column()
  reviewId: number;

  @CreateDateColumn()
  createdAt: Date;
}
```

**Unique constraint** : `(userId, reviewId)` - un like par user par review

---

### Entité : `ReviewComment`

Commentaires sur les reviews (discussions)

```typescript
@Entity()
export class ReviewComment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.reviewComments)
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => MediaReview, (review) => review.comments)
  review: MediaReview;

  @Column()
  reviewId: number;

  @Column({ type: 'text' })
  content: string;

  // Support pour threading (réponses)
  @Column({ nullable: true })
  parentCommentId?: number;

  @ManyToOne(() => ReviewComment, (comment) => comment.replies, {
    nullable: true,
  })
  parentComment?: ReviewComment;

  @OneToMany(() => ReviewComment, (comment) => comment.parentComment)
  replies: ReviewComment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

### Entité : `UserBadge`

Badges/achievements pour gamification

```typescript
@Entity()
export class UserBadge {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, (user) => user.badges)
  user: User;

  @Column()
  userId: number;

  @Column({ type: 'varchar' })
  badgeType: BadgeType;

  @Column({ nullable: true })
  metadata?: string; // JSON pour data additionnelle (ex: nombre pour "Watched 100 movies")

  @CreateDateColumn()
  earnedAt: Date;
}

export enum BadgeType {
  // Watching milestones
  MOVIES_WATCHED_10 = 'MOVIES_WATCHED_10',
  MOVIES_WATCHED_50 = 'MOVIES_WATCHED_50',
  MOVIES_WATCHED_100 = 'MOVIES_WATCHED_100',
  MOVIES_WATCHED_250 = 'MOVIES_WATCHED_250',
  MOVIES_WATCHED_500 = 'MOVIES_WATCHED_500',
  MOVIES_WATCHED_1000 = 'MOVIES_WATCHED_1000',

  TV_EPISODES_100 = 'TV_EPISODES_100',
  TV_EPISODES_500 = 'TV_EPISODES_500',
  TV_EPISODES_1000 = 'TV_EPISODES_1000',
  TV_EPISODES_5000 = 'TV_EPISODES_5000',

  // Review milestones
  REVIEWS_WRITTEN_10 = 'REVIEWS_WRITTEN_10',
  REVIEWS_WRITTEN_50 = 'REVIEWS_WRITTEN_50',
  REVIEWS_WRITTEN_100 = 'REVIEWS_WRITTEN_100',

  // Social engagement
  REVIEW_LIKES_RECEIVED_50 = 'REVIEW_LIKES_RECEIVED_50',
  REVIEW_LIKES_RECEIVED_100 = 'REVIEW_LIKES_RECEIVED_100',
  REVIEW_LIKES_RECEIVED_500 = 'REVIEW_LIKES_RECEIVED_500',

  // Special achievements
  WATCHING_STREAK_7 = 'WATCHING_STREAK_7',
  WATCHING_STREAK_30 = 'WATCHING_STREAK_30',
  WATCHING_STREAK_100 = 'WATCHING_STREAK_100',

  BINGE_WATCHER = 'BINGE_WATCHER', // Watched full season in 24h
  CRITIC = 'CRITIC', // 50+ detailed reviews
  EARLY_ADOPTER = 'EARLY_ADOPTER', // One of first users of tracking system
  TRENDSETTER = 'TRENDSETTER', // Review that got 100+ likes

  // Community roles
  TOP_REVIEWER_MONTH = 'TOP_REVIEWER_MONTH',
  TOP_REVIEWER_YEAR = 'TOP_REVIEWER_YEAR',
  COMMUNITY_HERO = 'COMMUNITY_HERO', // Significant community contribution
}
```

---

### Relations à ajouter aux entités existantes

#### User

```typescript
@OneToMany(() => WatchHistory, (watch) => watch.user)
watchHistory: WatchHistory[];

@OneToMany(() => MediaReview, (review) => review.user)
reviews: MediaReview[];

@OneToMany(() => ReviewLike, (like) => like.user)
reviewLikes: ReviewLike[];

@OneToMany(() => ReviewComment, (comment) => comment.user)
reviewComments: ReviewComment[];

@OneToMany(() => UserBadge, (badge) => badge.user)
badges: UserBadge[];
```

#### Media

```typescript
@OneToMany(() => WatchHistory, (watch) => watch.media)
watchHistory: WatchHistory[];

@OneToMany(() => MediaReview, (review) => review.media)
reviews: MediaReview[];
```

---

## 🔌 API Routes

### Watch History

```typescript
// Marquer comme vu (crée une nouvelle entrée dans l'historique)
POST /api/v1/media/:mediaId/watch
Body: {
  mediaType: 'MOVIE' | 'TV'
  seasonNumber?: number
  episodeNumber?: number
  watchedAt?: Date // optionnel, default: now
}
Response: { watchHistory: WatchHistory }

// Marquer plusieurs épisodes d'un coup
POST /api/v1/media/:mediaId/watch/batch
Body: {
  mediaType: 'TV'
  items: [
    { seasonNumber: 1, episodeNumber: 1 },
    { seasonNumber: 1, episodeNumber: 2 },
    // ...
  ]
}
Response: { watchHistory: WatchHistory[] }

// Récupérer l'historique pour un média
GET /api/v1/media/:mediaId/watch/history
Query: ?seasonNumber=1&episodeNumber=1 (optionnel)
Response: {
  watchCount: 3,
  history: [
    { id: 1, watchedAt: "2024-12-15T21:30:00Z" },
    { id: 2, watchedAt: "2024-07-22T15:15:00Z" },
    // ...
  ]
}

// Supprimer une entrée d'historique spécifique
DELETE /api/v1/media/:mediaId/watch/:watchId
Response: { success: true }
```

---

### Reviews

```typescript
// Récupérer toutes les reviews publiques d'un média
GET /api/v1/media/:mediaId/reviews
Query: ?seasonNumber=1 (optionnel pour séries)
       &sort=latest|top|rating (default: latest)
       &limit=20&offset=0
Response: {
  averageRating: 8.7,
  totalReviews: 12,
  totalRatings: 47, // Peut avoir plus de ratings que de reviews
  reviews: [
    {
      id: 1,
      user: { id, username, avatar, badges: [...] },
      rating: 10,
      content: "...",
      containsSpoilers: true,
      isPublic: true,
      createdAt: "...",
      likesCount: 23,
      commentsCount: 5,
      isLikedByMe: false
    },
    // ...
  ]
}

// Récupérer MA review pour un média
GET /api/v1/media/:mediaId/reviews/me
Query: ?seasonNumber=1
Response: {
  id: 1,
  rating: 8,
  content: "...",
  containsSpoilers: false,
  isPublic: false,
  watchedAt: "...",
  createdAt: "...",
  updatedAt: "...",
  likesCount: 5,
  commentsCount: 2
}

// Créer ou mettre à jour ma review
POST /api/v1/media/:mediaId/reviews
Body: {
  mediaType: 'MOVIE' | 'TV'
  seasonNumber?: number
  rating?: number (1-10)
  content?: string
  containsSpoilers: boolean
  isPublic: boolean
  watchedAt?: Date
}
Response: { review: MediaReview }

// Supprimer ma review
DELETE /api/v1/media/:mediaId/reviews/me
Query: ?seasonNumber=1
Response: { success: true }

// Liker/unliker une review
POST /api/v1/reviews/:reviewId/like
Response: { liked: true, likesCount: 24 }

DELETE /api/v1/reviews/:reviewId/like
Response: { liked: false, likesCount: 23 }

// Récupérer les commentaires d'une review
GET /api/v1/reviews/:reviewId/comments
Response: {
  comments: [
    {
      id: 1,
      user: { id, username, avatar },
      content: "I totally agree!",
      createdAt: "...",
      replies: [
        { id: 2, user: {...}, content: "Me too!", ... }
      ]
    },
    // ...
  ]
}

// Ajouter un commentaire sur une review
POST /api/v1/reviews/:reviewId/comments
Body: {
  content: string
  parentCommentId?: number // Pour répondre à un commentaire
}
Response: { comment: ReviewComment }

// Supprimer son commentaire
DELETE /api/v1/reviews/:reviewId/comments/:commentId
Response: { success: true }
```

---

### User Stats & Activity

```typescript
// Stats globales d'un user
GET /api/v1/user/:userId/stats
Response: {
  movies: {
    watched: 247,
    rewatched: 12,
    uniqueWatched: 235,
    rated: 156,
    averageRating: 7.4
  },
  tv: {
    episodesWatched: 1834,
    seriesStarted: 92,
    seriesCompleted: 45,
    averageRating: 7.8
  },
  totalWatchTime: 1245, // heures estimées via TMDB runtime
  reviews: {
    total: 56,
    public: 42,
    private: 14,
    totalLikesReceived: 234
  },
  currentStreak: 15, // jours consécutifs avec ≥1 watch
  longestStreak: 47
}

// Activité récente d'un user
GET /api/v1/user/:userId/activity
Query: ?limit=20&offset=0&type=all|watch|review
Response: {
  activities: [
    {
      type: 'WATCH',
      media: { id, title, posterPath, mediaType },
      seasonNumber?: 5,
      episodeNumber?: 16,
      episodeTitle?: "Felina",
      watchedAt: "...",
      isRewatch: true
    },
    {
      type: 'REVIEW',
      media: { id, title, posterPath, mediaType },
      rating: 8,
      reviewSnippet: "Great movie! The ending...",
      containsSpoilers: false,
      isPublic: true,
      likesCount: 12,
      commentsCount: 3,
      createdAt: "..."
    },
    {
      type: 'BADGE_EARNED',
      badge: {
        type: 'MOVIES_WATCHED_100',
        displayName: "Century Club",
        description: "Watched 100 movies",
        icon: "🎬"
      },
      earnedAt: "..."
    },
    // ...
  ]
}

// Top rated par un user
GET /api/v1/user/:userId/top-rated
Query: ?limit=10&mediaType=MOVIE|TV
Response: {
  items: [
    {
      media: { id, title, posterPath, year, genres },
      rating: 10,
      reviewSnippet?: "Masterpiece!",
      watchCount: 3,
      lastWatchedAt: "..."
    },
    // ...
  ]
}

// Historique complet de watch d'un user
GET /api/v1/user/:userId/watch-history
Query: ?limit=50&offset=0&mediaType=MOVIE|TV
Response: {
  total: 2081,
  history: [
    {
      id: 1,
      media: { id, title, posterPath, mediaType },
      seasonNumber?: 5,
      episodeNumber?: 16,
      watchedAt: "...",
      rating?: 10
    },
    // ...
  ]
}

// Reviews écrites par un user
GET /api/v1/user/:userId/reviews
Query: ?limit=20&offset=0&visibility=all|public|private
Response: {
  total: 56,
  reviews: [
    {
      id: 1,
      media: { id, title, posterPath, mediaType },
      rating: 10,
      content: "...",
      containsSpoilers: false,
      isPublic: true,
      likesCount: 23,
      commentsCount: 5,
      createdAt: "..."
    },
    // ...
  ]
}

// Badges d'un user
GET /api/v1/user/:userId/badges
Response: {
  badges: [
    {
      type: 'MOVIES_WATCHED_100',
      displayName: "Century Club",
      description: "Watched 100 movies",
      icon: "🎬",
      earnedAt: "2024-12-01T10:30:00Z",
      progress?: { current: 100, target: 100 }
    },
    // ...
  ],
  nextBadges: [
    {
      type: 'MOVIES_WATCHED_250',
      displayName: "Movie Marathon Master",
      description: "Watch 250 movies",
      icon: "🏆",
      progress: { current: 100, target: 250 }
    },
    // ...
  ]
}
```

---

### Community Feed

```typescript
// Feed des reviews publiques récentes de la communauté
GET /api/v1/reviews/feed
Query: ?mediaType=all|MOVIE|TV
       &sort=latest|top (top = most liked in last 30 days)
       &limit=20&offset=0
Response: {
  reviews: [
    {
      id: 1,
      user: { id, username, avatar, badges: [...] },
      media: { id, title, posterPath, mediaType, year },
      rating: 9,
      content: "...",
      containsSpoilers: false,
      createdAt: "...",
      likesCount: 23,
      commentsCount: 5,
      isLikedByMe: false
    },
    // ...
  ]
}

// Leaderboard communauté
GET /api/v1/community/leaderboard
Query: ?period=week|month|year|alltime&metric=reviews|likes|watches
Response: {
  period: 'month',
  metric: 'reviews',
  leaderboard: [
    {
      rank: 1,
      user: { id, username, avatar, badges: [...] },
      value: 45, // 45 reviews ce mois
      change: +5 // position change vs last period
    },
    // ...
  ]
}

// Stats communauté globales
GET /api/v1/community/stats
Response: {
  totalUsers: 152,
  activeUsersThisMonth: 87,
  totalWatches: 45234,
  totalReviews: 1234,
  averageCommunityRating: 7.6,
  mostWatchedThisWeek: [
    { media: {...}, watchCount: 23 },
    // ...
  ],
  topRatedThisMonth: [
    { media: {...}, averageRating: 9.2, reviewCount: 15 },
    // ...
  ]
}
```

---

## 🎨 Interface Utilisateur

### Structure de navigation

```
Navbar Seerr (existante)
├── Discover
├── Movies
├── TV Shows
├── Requests
├── Issues
├── ⭐ MY ACTIVITY (nouveau) ← Dashboard principal
├── 🌍 COMMUNITY (nouveau) ← Feed communauté
└── Users (admin)
```

---

### Page principale : `/activity` (Dashboard)

**Onglets** :

1. 📊 **Overview** - Stats + activité récente
2. 🎬 **Movies** - Liste de tous les films vus
3. 📺 **TV Shows** - Séries avec progress tracking
4. ✍️ **Reviews** - Toutes mes reviews
5. 🏆 **Badges** - Achievements et progression

---

#### Onglet 1️⃣ : 📊 Overview

```
┌─────────────────────────────────────────────────────────────┐
│ ⭐ My Activity                         [@username ▼]        │
│                                        🏆 12 badges         │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Quick Stats                                                 │
│ ┌──────────────┬──────────────┬──────────────┬───────────┐ │
│ │ 🎬 Movies    │ 📺 Episodes  │ ⏱️ Watch Time│ ⭐ Avg    │ │
│ │ 247 watched  │ 1,834 seen   │ 1,245 hrs    │ 7.2/10    │ │
│ │ 12 rewatched │ 92 series    │              │ 56 reviews│ │
│ └──────────────┴──────────────┴──────────────┴───────────┘ │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 📅 Recent Activity                      [View all activity] │
│                                                             │
│ 🕐 2 hours ago                                              │
│ ✅ Watched Breaking Bad S05E16 "Felina"                    │
│ ⭐ Rated 10/10 · "Perfect ending..."                       │
│ 👍 12 likes · 💬 3 comments                                │
│ [View] [Edit review]                                        │
│                                                             │
│ 🕐 Yesterday at 9:30 PM                                     │
│ ✅ Watched Inception (rewatch #3)                          │
│ [Add rating]                                                │
│                                                             │
│ 🕐 Dec 10, 2024                                             │
│ 🏆 Earned badge: "Century Club" (100 movies watched)       │
│                                                             │
│ 🕐 Dec 10, 2024                                             │
│ ✍️ Reviewed The Shawshank Redemption                       │
│ ⭐ 10/10 · "Masterpiece!"                                  │
│ 👍 23 likes · 💬 5 comments                                │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🏆 Your Top Rated                                           │
│                                                             │
│ 1. The Shawshank Redemption    10/10  🎬                   │
│ 2. Breaking Bad                10/10  📺                   │
│ 3. Interstellar                 9/10  🎬                   │
│ 4. The Wire                     9/10  📺                   │
│ 5. Inception                    8/10  🎬 (watched 3×)      │
│                                                             │
│                                        [View full rankings] │
└─────────────────────────────────────────────────────────────┘
```

---

#### Onglet 2️⃣ : 🎬 Movies

```
┌─────────────────────────────────────────────────────────────┐
│ 🎬 My Movies (247 watched)                                  │
│                                                             │
│ [Sort: Recently Watched ▼] [Filter: All / Rated / Unrated] │
│ [Search movies...]                                          │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Poster] Inception                          ⭐ 8/10     │ │
│ │          Action, Sci-Fi · 2010                          │ │
│ │          ✅ Watched 3 times (last: Dec 15, 2024)       │ │
│ │          💬 "Amazing movie! The layered..." (Private)  │ │
│ │          [View] [Edit rating] [View history]            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Poster] The Shawshank Redemption           ⭐ 10/10   │ │
│ │          Drama · 1994                                   │ │
│ │          ✅ Watched once (Dec 1, 2024)                 │ │
│ │          💬 "Absolute masterpiece!" (Public)           │ │
│ │          👍 23 likes · 💬 5 comments                   │ │
│ │          [View] [Edit review]                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Stats sidebar:
┌──────────────────────┐
│ 📊 Movie Stats       │
│                      │
│ Total: 247           │
│ Rated: 156           │
│ Unrated: 91          │
│ Rewatched: 12        │
│                      │
│ Avg rating: 7.4/10   │
│                      │
│ Top genre:           │
│ 🎭 Action (87)       │
│ 🚀 Sci-Fi (54)       │
│ 😂 Comedy (42)       │
└──────────────────────┘
```

---

#### Onglet 3️⃣ : 📺 TV Shows

```
┌─────────────────────────────────────────────────────────────┐
│ 📺 My TV Shows (92 series)                                  │
│                                                             │
│ [Sort: Recently Watched ▼] [Filter: Watching / Completed]  │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Poster] Breaking Bad                       ⭐ 10/10   │ │
│ │          Crime, Drama · 2008-2013                       │ │
│ │                                                         │ │
│ │          Progress: ████████████████ 100% (62/62 eps)   │ │
│ │          ✅ Completed on Dec 12, 2024                  │ │
│ │                                                         │ │
│ │          💬 "Best series ever made!" (Public)          │ │
│ │          👍 45 likes · 💬 12 comments                  │ │
│ │                                                         │ │
│ │          [View details ▼] [Edit review]                 │ │
│ │          ┌────────────────────────────────────────────┐ │ │
│ │          │ Season 1: ████████ 100% (7/7) · ⭐ 8/10  │ │ │
│ │          │ Season 2: ████████ 100% (13/13) · ⭐ 9/10│ │ │
│ │          │ Season 3: ████████ 100% (13/13) · ⭐ 9/10│ │ │
│ │          │ Season 4: ████████ 100% (13/13) · ⭐ 9/10│ │ │
│ │          │ Season 5: ████████ 100% (16/16) · ⭐10/10│ │ │
│ │          │                                           │ │ │
│ │          │ [View episode details]                    │ │ │
│ │          └────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Poster] The Wire                           ⭐ 9/10    │ │
│ │          Crime, Drama · 2002-2008                       │ │
│ │                                                         │ │
│ │          Progress: ██████░░░░ 60% (36/60 eps)          │ │
│ │          🔄 Currently watching                          │ │
│ │          Last watched: S03E06 (Dec 14, 2024)            │ │
│ │                                                         │ │
│ │          [Continue watching] [Mark season as watched]   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

#### Onglet 4️⃣ : ✍️ My Reviews

```
┌─────────────────────────────────────────────────────────────┐
│ ✍️ My Reviews (56 written)                                  │
│                                                             │
│ [Sort: Recent ▼] [Filter: All / Public / Private / Spoilers]│
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Breaking Bad S05E16 "Felina"            ⭐ 10/10       │ │
│ │ Reviewed 2 hours ago · 👁️ Public                       │ │
│ │                                                         │ │
│ │ "Perfect ending to a perfect series. The way Walt's    │ │
│ │ story comes full circle is masterful..."               │ │
│ │                                                         │ │
│ │ 👍 12 likes · 💬 3 comments                            │ │
│ │ [Edit] [Delete] [View on media page]                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ The Shawshank Redemption                    ⭐ 10/10  │ │
│ │ Reviewed Dec 1, 2024 · 👁️ Public · ⚠️ Spoilers       │ │
│ │                                                         │ │
│ │ [Click to reveal spoilers]                             │ │
│ │                                                         │ │
│ │ 👍 23 likes · 💬 5 comments                            │ │
│ │ [Edit] [Delete] [View comments]                        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

#### Onglet 5️⃣ : 🏆 Badges

```
┌─────────────────────────────────────────────────────────────┐
│ 🏆 My Badges (12 earned)                                    │
│                                                             │
│ Earned Badges                                               │
│ ┌──────────────┬──────────────┬──────────────┬───────────┐ │
│ │ 🎬           │ 📺           │ ✍️           │ 🔥        │ │
│ │ Century Club │ Binge Master │ Top Reviewer │ 30-Day    │ │
│ │ 100 movies   │ 1000 episodes│ 50 reviews   │ Streak    │ │
│ │ Dec 10, 2024 │ Dec 5, 2024  │ Nov 20, 2024 │ Active    │ │
│ └──────────────┴──────────────┴──────────────┴───────────┘ │
│                                                             │
│ ┌──────────────┬──────────────┬──────────────┬───────────┐ │
│ │ 🏆           │ 💬           │ 👍           │ 🌟        │ │
│ │ Completionist│ Social       │ Liked        │ Early     │ │
│ │ 10 series    │ 100 comments │ 50+ likes    │ Adopter   │ │
│ │ Nov 1, 2024  │ Oct 15, 2024 │ Oct 1, 2024  │ Sep 2024  │ │
│ └──────────────┴──────────────┴──────────────┴───────────┘ │
│                                                             │
│ Next Badges to Earn                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🎬 Movie Marathon Master - Watch 250 movies             │ │
│ │ Progress: ████████░░ 100/250 (40%)                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📺 TV Addict - Watch 5000 episodes                      │ │
│ │ Progress: ███░░░░░░░ 1834/5000 (37%)                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔥 100-Day Streak - Watch something 100 days in a row   │ │
│ │ Progress: ███░░░░░░░ 30/100 (30%)                      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### Page communauté : `/community` (nouveau)

**Onglets** :

1. 🌍 **Feed** - Reviews récentes de la communauté
2. 🏆 **Leaderboard** - Top contributeurs
3. 📊 **Stats** - Stats globales de la communauté

---

#### Onglet 1️⃣ : 🌍 Community Feed

```
┌─────────────────────────────────────────────────────────────┐
│ 🌍 Community Reviews                                        │
│                                                             │
│ [Filter: All / Movies / TV] [Sort: Recent / Top Rated]      │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [@alice] 🏆🎬 reviewed Breaking Bad          ⭐ 10/10 │ │
│ │          Century Club · Top Reviewer                    │ │
│ │ 2 hours ago                                             │ │
│ │                                                         │ │
│ │ "Best series ever made! The character development..."  │ │
│ │                                                         │ │
│ │ 👍 45 · 💬 12 comments                                 │ │
│ │ [Like] [Comment] [View full review]                     │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [@bob] 🔥 reviewed Inception                 ⭐ 6/10  │ │
│ │        30-Day Streak                                    │ │
│ │ 5 hours ago · ⚠️ Contains spoilers                     │ │
│ │                                                         │ │
│ │ "Good but overhyped. The ending..."                    │ │
│ │ [Click to reveal spoilers]                             │ │
│ │                                                         │ │
│ │ 👍 8 · 💬 3 comments                                   │ │
│ │ [Like] [Comment]                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

#### Onglet 2️⃣ : 🏆 Leaderboard

```
┌─────────────────────────────────────────────────────────────┐
│ 🏆 Community Leaderboard                                    │
│                                                             │
│ [Period: This Month ▼] [Metric: Reviews / Likes / Watches] │
│                                                             │
│ Top Reviewers This Month                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🥇 @alice        🏆🎬✍️                        45 reviews│ │
│ │    Century Club · Top Reviewer                    ↑ +2  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🥈 @bob          🔥📺                            32 reviews│ │
│ │    30-Day Streak · Binge Master                   ↓ -1  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🥉 @charlie      🎬💬                            28 reviews│ │
│ │    Century Club · Social                          →  0  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Most Liked Reviews                                          │
│ Most Active Watchers                                        │
└─────────────────────────────────────────────────────────────┘
```

---

#### Onglet 3️⃣ : 📊 Community Stats

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Community Stats                                          │
│                                                             │
│ ┌──────────────┬──────────────┬──────────────┬───────────┐ │
│ │ 👥 Users     │ 🎬 Watches   │ ✍️ Reviews   │ ⭐ Avg    │ │
│ │ 152 total    │ 45,234 total │ 1,234 total  │ 7.6/10    │ │
│ │ 87 active    │              │              │           │ │
│ └──────────────┴──────────────┴──────────────┴───────────┘ │
│                                                             │
│ 🔥 Most Watched This Week                                   │
│ 1. Breaking Bad - 23 watches                                │
│ 2. Inception - 18 watches                                   │
│ 3. The Wire - 15 watches                                    │
│                                                             │
│ ⭐ Top Rated This Month (min. 10 reviews)                   │
│ 1. The Shawshank Redemption - 9.4/10 (18 reviews)          │
│ 2. Breaking Bad - 9.2/10 (23 reviews)                       │
│ 3. The Wire - 9.0/10 (15 reviews)                           │
│                                                             │
│ 📈 Community Activity Graph                                 │
│ [Line chart: Watches per day over last 30 days]            │
└─────────────────────────────────────────────────────────────┘
```

---

### Intégration aux pages Movie/TV Details

Sur les pages `/movie/[movieId]` et `/tv/[tvId]`, ajouter une section simplifiée :

```
┌────────────────────────────────────────────────┐
│ [Poster]  Inception                            │
│           2010 · Action, Sci-Fi                │
│                                                │
│           [Request Movie] [Add to Watchlist]   │
│                                                │
│           ─────────────────────────────────    │
│                                                │
│           Your Activity:                       │
│           ✅ Watched 3 times (last: Dec 15)   │
│           ⭐ Your rating: 8/10                │
│           💬 "Amazing movie..." (Private)     │
│           [Quick Mark as Watched]             │
│           [Edit in My Activity →]             │
│                                                │
│           ─────────────────────────────────    │
│                                                │
│           Community:                           │
│           ⭐ 8.7/10 (47 ratings)               │
│           💬 12 reviews                        │
│           [View community reviews →]          │
└────────────────────────────────────────────────┘
```

---

### Modal "Mark as Watched" (quick action)

Accessible depuis les pages de détails :

```
╔══════════════════════════════════════╗
║ ✅ Mark as Watched                   ║
╠══════════════════════════════════════╣
║                                      ║
║ Inception (2010)                     ║
║                                      ║
║ When did you watch it?               ║
║ ● Just now                           ║
║ ○ Custom date: [____]                ║
║                                      ║
║ ─────────────────────────────────    ║
║                                      ║
║ Rate this movie? (optional)          ║
║ ☆☆☆☆☆☆☆☆☆☆                          ║
║ [Hover to select 1-10]               ║
║                                      ║
║ ─────────────────────────────────    ║
║                                      ║
║ [ ] Write a review                   ║
║ [x] Go to My Activity after          ║
║                                      ║
║ [Mark as Watched] [Cancel]           ║
╚══════════════════════════════════════╝
```

Si l'user coche "Write a review", il est redirigé vers `/activity?tab=reviews&mediaId=550&action=new`

---

## 🏆 Système de Badges

### Catégories de badges

#### 🎬 Watching Milestones

- **Movie Starter** (10 movies) - "Your journey begins"
- **Movie Buff** (50 movies) - "You're getting the hang of it"
- **Century Club** (100 movies) - "100 movies watched!"
- **Movie Marathon Master** (250 movies) - "Quarter of a thousand!"
- **Cinephile** (500 movies) - "Serious dedication"
- **Movie Legend** (1000 movies) - "Legendary status"

#### 📺 TV Milestones

- **Episode Explorer** (100 episodes) - "First hundred down"
- **Series Regular** (500 episodes) - "You love TV!"
- **Binge Master** (1000 episodes) - "Thousand episodes!"
- **TV Addict** (5000 episodes) - "Ultimate binge watcher"

#### ✍️ Review Milestones

- **First Review** (1 review) - "Shared your first thoughts"
- **Reviewer** (10 reviews) - "You're a reviewer now"
- **Prolific Reviewer** (50 reviews) - "Sharing the love"
- **Top Reviewer** (100 reviews) - "Community critic"

#### 👍 Social Engagement

- **First Like** (1 like received) - "Someone liked your review!"
- **Popular Opinion** (50 likes) - "People agree with you"
- **Influential Critic** (100 likes) - "Your voice matters"
- **Trendsetter** (500 likes) - "Community favorite"

#### 🔥 Streaks

- **Week Warrior** (7-day streak) - "A whole week!"
- **Monthly Master** (30-day streak) - "A full month!"
- **Century Streaker** (100-day streak) - "Unstoppable!"

#### 🏆 Special Achievements

- **Binge Watcher** - Watched full season in 24h
- **Completionist** - Completed 10 series
- **Rewatch King/Queen** - Rewatched 20 different items
- **Early Adopter** - One of first users of tracking system
- **Community Hero** - Significant community contribution (admin-granted)
- **Top Reviewer of the Month** - Most reviews in a month
- **Top Reviewer of the Year** - Most reviews in a year

---

### Affichage des badges

#### Sur les profils utilisateurs

```
[@alice] 🏆🎬✍️💬🔥
         ↑  ↑  ↑  ↑  ↑
         │  │  │  │  └─ 30-Day Streak
         │  │  │  └──── Social (100+ comments)
         │  │  └─────── Top Reviewer
         │  └────────── Century Club
         └───────────── Community Hero (special)
```

Maximum 5 badges affichés par défaut, avec tooltip pour voir tous les badges au hover.

#### Dans les reviews

Les 2-3 badges les plus prestigieux de l'auteur apparaissent sous son nom.

#### Progression

Dans l'onglet "Badges" du dashboard, afficher une barre de progression pour les prochains badges à débloquer.

---

### Notifications de badges

Quand un user débloque un badge :

1. Notification in-app (toast)
2. Ajout dans l'activity feed
3. Optionnel : Discord webhook "🏆 @alice earned the Century Club badge!"

---

## 🔧 Permissions

### Nouvelles permissions à ajouter

```typescript
export const Permission = {
  // ... existing permissions

  TRACK_MEDIA: 1 << 25, // Peut marquer comme vu
  REVIEW_MEDIA: 1 << 26, // Peut écrire des reviews
  DELETE_REVIEWS: 1 << 27, // Admin: supprimer reviews des autres
  MANAGE_BADGES: 1 << 28, // Admin: grant/revoke badges manuellement
};
```

**Par défaut** : Tous les utilisateurs ont `TRACK_MEDIA` + `REVIEW_MEDIA`

---

## 🚀 Plan d'implémentation

### Phase 1 : MVP Core (Fonctionnalités essentielles)

#### Backend

- [ ] Créer migration DB pour `WatchHistory`, `MediaReview`
- [ ] Créer entités TypeORM avec relations
- [ ] Routes API watch history (POST/GET/DELETE)
- [ ] Routes API reviews (CRUD)
- [ ] Routes API stats basiques (`/user/:id/stats`)
- [ ] Endpoint pour récupérer reviews publiques d'un média
- [ ] Calculer average rating communautaire

#### Frontend

- [ ] Nouveau menu "My Activity" dans navbar
- [ ] Page `/activity` avec routing par onglets
- [ ] Onglet "Overview" avec stats cards + activity feed
- [ ] Onglet "Movies" avec liste + filtres
- [ ] Onglet "TV Shows" avec progress tracking
- [ ] Onglet "Reviews" avec liste
- [ ] Composant `<MarkAsWatchedButton>` + modal
- [ ] Composant `<RatingInput>` (1-10 stars)
- [ ] Composant `<ReviewForm>` avec :
  - Textarea pour review
  - Checkbox spoiler
  - Radio public/private
- [ ] Section "Your Activity" sur movie/TV details pages
- [ ] Section "Community Reviews" avec spoiler blur

---

### Phase 2 : Social & Community

#### Backend

- [ ] Créer entités `ReviewLike`, `ReviewComment`
- [ ] Routes API pour likes (POST/DELETE)
- [ ] Routes API pour comments (CRUD + threading)
- [ ] Community feed endpoint (`/reviews/feed`)
- [ ] Leaderboard endpoint
- [ ] Community stats endpoint

#### Frontend

- [ ] Nouveau menu "Community" dans navbar
- [ ] Page `/community` avec onglets
- [ ] Feed de reviews publiques
- [ ] Système de likes sur reviews
- [ ] Système de commentaires avec threading
- [ ] Leaderboard avec filtres
- [ ] Community stats dashboard
- [ ] Profils utilisateurs publics (`/activity/[username]`)

---

### Phase 3 : Gamification & Badges

#### Backend

- [ ] Créer entité `UserBadge`
- [ ] Service de badge detection (listeners sur events)
- [ ] Routes API badges (`/user/:id/badges`)
- [ ] Système de notification de badges
- [ ] Job cron pour calculer badges périodiques (top reviewer, etc.)

#### Frontend

- [ ] Onglet "Badges" dans dashboard
- [ ] Affichage badges sur profils
- [ ] Affichage badges dans reviews
- [ ] Toast notifications pour nouveaux badges
- [ ] Page dédiée avec tous les badges disponibles
- [ ] Progress bars pour badges en cours

---

### Phase 4 : Advanced Features

#### Backend

- [ ] Auto-sync Jellyfin/Plex watch history (cron job)
- [ ] Système de recommandations basé sur notes
- [ ] Export de données (CSV/JSON)
- [ ] Admin dashboard pour stats
- [ ] Webhooks Discord pour milestones communauté

#### Frontend

- [ ] Graphiques de stats avancées (recharts)
- [ ] Comparaison notes user vs communauté vs TMDB
- [ ] Recommandations personnalisées
- [ ] Page d'export de données
- [ ] Graphs de progression (watching trends over time)

---

## 📈 Métriques de succès

### User Engagement

- % d'utilisateurs qui trackent au moins 1 média
- Nombre moyen de médias trackés par user
- % d'utilisateurs qui écrivent des reviews
- Taux de reviews publiques vs privées

### Community Health

- Nombre de reviews publiques par semaine
- Nombre de likes/commentaires par review
- Nombre d'utilisateurs actifs mensuellement
- Taux de rétention (users qui reviennent tracker)

### Quality

- Distribution des notes (éviter le biais 10/10)
- Longueur moyenne des reviews
- Ratio spoilers/non-spoilers

---

## 🔒 Privacy & Modération

### Privacy

- Reviews peuvent être publiques ou privées (choix user)
- Watch history toujours privé par défaut
- Option pour rendre profil public/privé
- Les admins peuvent voir tout, mais pas modifier reviews des autres

### Modération

- Admins peuvent supprimer reviews inappropriées (permission `DELETE_REVIEWS`)
- Users peuvent signaler reviews (feature phase 3)
- Pas de censure automatique, modération manuelle

---

## 🎯 Notes d'implémentation

### Performance

- **Indexes DB critiques** :
  - `(userId, mediaId, watchedAt)` sur WatchHistory
  - `(userId, mediaId, seasonNumber)` sur MediaReview
  - `(mediaId, isPublic)` sur MediaReview pour queries publiques
  - `(userId, reviewId)` sur ReviewLike

### Caching

- Cache des stats communautaires (avg rating, total reviews) - TTL 5 min
- Cache des leaderboards - TTL 1 hour
- Cache des badges - invalidation on new badge earned

### Edge Cases

- User supprime son compte → soft delete reviews (keep for community, anonymize)
- Média supprimé de la DB → cascade delete ou soft delete reviews?
- User marque comme vu avant que média soit disponible → allow (peut l'avoir vu ailleurs)

---

## 🌐 Internationalisation

Préparer les clés i18n pour :

- Noms des badges (traduits)
- Labels UI (buttons, tabs, etc.)
- Placeholder texte reviews
- Messages de validation

---

## ✅ Checklist pré-lancement

- [ ] Migration DB testée sur SQLite et PostgreSQL
- [ ] Tests API endpoints (unit + integration)
- [ ] Tests frontend (Cypress E2E)
- [ ] Documentation API (Swagger)
- [ ] Performance testing (N+1 queries)
- [ ] i18n complet (FR/EN minimum)
- [ ] Mobile responsive
- [ ] Accessibility (ARIA labels)
- [ ] Discord notifications configurées
- [ ] Backup DB avant déploiement

---

## 📝 Questions ouvertes / Décisions futures

1. **Rewatches multiples le même jour** : Allow ou bloquer?

   - Proposition : Allow, mais grouper dans l'UI

2. **Edition d'historique** : User peut modifier `watchedAt` après coup?

   - Proposition : Oui, pour corriger erreurs

3. **Suppression de reviews** : Soft delete ou hard delete?

   - Proposition : Soft delete (keep stats), anonymize si user deleted

4. **Limite de reviews** : Limite de longueur du texte?

   - Proposition : 5000 caractères max

5. **Notifications** : Quels events notifier?

   - Proposition Phase 1 : Badges unlocked
   - Proposition Phase 2 : Someone liked/commented your review

6. **Import depuis Trakt/Letterboxd** : Feature future?
   - Proposition Phase 4 : CSV import

---

_Ce document est un living document et sera mis à jour au fur et à mesure de l'implémentation._
