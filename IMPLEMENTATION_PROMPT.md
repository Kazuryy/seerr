# Implementation Prompt: Media Tracking & Reviews - Phase 1 Backend

## 🎯 Objectif

Implémenter les **entités TypeORM** et **migrations de base de données** pour le système de tracking et reviews de médias, en suivant les patterns existants du projet Seerr.

---

## 📚 Contexte du projet

### Stack technique

- **Backend**: Node.js + Express + TypeScript
- **ORM**: TypeORM 0.3
- **Databases**: SQLite (dev) + PostgreSQL (prod)
- **Conventions**:
  - Entités dans `server/entity/`
  - Migrations dans `server/migration/sqlite/` et `server/migration/postgres/`
  - Use `DbAwareColumn` pour les colonnes datetime (support SQLite + PostgreSQL)

### Patterns existants observés

#### Pattern d'entité (exemple: DeletionRequest.ts)

```typescript
import { DbAwareColumn } from '@server/utils/DbColumnHelper';
import {
  Column,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class MyEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: 'integer' })
  public someId: number;

  @ManyToOne(() => User, {
    eager: true, // Load user automatically
    onDelete: 'CASCADE',
  })
  public user: User;

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  public createdAt: Date;

  @DbAwareColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  public updatedAt: Date;

  constructor(init?: Partial<MyEntity>) {
    Object.assign(this, init);
  }
}
```

#### Pattern de migration SQLite (exemple: AddDeletionVoting)

```typescript
import type { MigrationInterface, QueryRunner } from 'typeorm';

export class MyMigration1234567890123 implements MigrationInterface {
  name = 'MyMigration1234567890123';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "my_table" (` +
        `"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, ` +
        `"createdAt" datetime NOT NULL DEFAULT (datetime('now')), ` +
        `CONSTRAINT "FK_my_table_user" FOREIGN KEY ("userId") ` +
        `REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION` +
        `)`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_my_table_field" ON "my_table" ("field")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_my_table_field"`);
    await queryRunner.query(`DROP TABLE "my_table"`);
  }
}
```

#### Pattern de migration PostgreSQL

```typescript
// Similaire mais avec syntaxe PostgreSQL
await queryRunner.query(
  `CREATE TABLE "my_table" (` +
    `"id" SERIAL NOT NULL, ` +
    `"createdAt" TIMESTAMP NOT NULL DEFAULT now(), ` +
    `CONSTRAINT "PK_my_table" PRIMARY KEY ("id")` +
    `)`
);
```

---

## 🎯 Tâches à accomplir

### Étape 1: Créer les entités TypeORM

#### 1.1 Créer `server/entity/WatchHistory.ts`

**Spécifications** (voir FEATURE_TRACKING_REVIEWS.md ligne 54-93):

```typescript
@Entity()
export class WatchHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Media)
  media: Media;

  @Column()
  mediaId: number;

  @Column({ type: 'varchar' })
  mediaType: 'MOVIE' | 'TV';

  @Column({ nullable: true })
  seasonNumber?: number;

  @Column({ nullable: true })
  episodeNumber?: number;

  @DbAwareColumn({ type: 'datetime' })
  watchedAt: Date;

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @DbAwareColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
```

**Indexes requis**:

- Index composé: `(userId, mediaId, watchedAt)` pour queries rapides
- **PAS de unique constraint** (permet rewatches)

**Relations**:

- `ManyToOne` vers User (onDelete: CASCADE)
- `ManyToOne` vers Media (onDelete: CASCADE)

---

#### 1.2 Créer `server/entity/MediaReview.ts`

**Spécifications** (voir FEATURE_TRACKING_REVIEWS.md ligne 96-159):

```typescript
@Entity()
export class MediaReview {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  user: User;

  @Column()
  userId: number;

  @ManyToOne(() => Media)
  media: Media;

  @Column()
  mediaId: number;

  @Column({ type: 'varchar' })
  mediaType: 'MOVIE' | 'TV';

  @Column({ nullable: true })
  seasonNumber?: number;

  @Column({ nullable: true, type: 'int' })
  rating?: number; // 1-10

  @Column({ nullable: true, type: 'text' })
  content?: string;

  @Column({ default: false })
  containsSpoilers: boolean;

  @Column({ default: true })
  isPublic: boolean;

  @DbAwareColumn({ nullable: true, type: 'datetime' })
  watchedAt?: Date;

  @DbAwareColumn({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @DbAwareColumn({
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
```

**Indexes requis**:

- Index composé: `(userId, mediaId, seasonNumber)` - UNIQUE constraint
- Index: `(mediaId, isPublic)` pour queries publiques

**Relations**:

- `ManyToOne` vers User (onDelete: CASCADE)
- `ManyToOne` vers Media (onDelete: CASCADE)

---

### Étape 2: Mettre à jour les entités existantes

#### 2.1 Mettre à jour `server/entity/User.ts`

**Ajouter les relations** (après les relations existantes):

```typescript
@OneToMany(() => WatchHistory, (watch) => watch.user)
watchHistory: WatchHistory[];

@OneToMany(() => MediaReview, (review) => review.user)
reviews: MediaReview[];
```

#### 2.2 Mettre à jour `server/entity/Media.ts`

**Ajouter les relations** (après les relations existantes):

```typescript
@OneToMany(() => WatchHistory, (watch) => watch.media)
watchHistory: WatchHistory[];

@OneToMany(() => MediaReview, (review) => review.media)
reviews: MediaReview[];
```

---

### Étape 3: Créer les migrations

#### 3.1 Migration SQLite: `server/migration/sqlite/TIMESTAMP-AddMediaTracking.ts`

**Tables à créer**:

**watch_history**:

```sql
CREATE TABLE "watch_history" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "userId" integer NOT NULL,
  "mediaId" integer NOT NULL,
  "mediaType" varchar NOT NULL,
  "seasonNumber" integer,
  "episodeNumber" integer,
  "watchedAt" datetime NOT NULL,
  "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
  "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
  CONSTRAINT "FK_watch_history_user" FOREIGN KEY ("userId")
    REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "FK_watch_history_media" FOREIGN KEY ("mediaId")
    REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
)
```

**Indexes**:

- `CREATE INDEX "IDX_watch_history_userId" ON "watch_history" ("userId")`
- `CREATE INDEX "IDX_watch_history_mediaId" ON "watch_history" ("mediaId")`
- `CREATE INDEX "IDX_watch_history_watchedAt" ON "watch_history" ("watchedAt")`
- `CREATE INDEX "IDX_watch_history_composite" ON "watch_history" ("userId", "mediaId", "watchedAt")`

**media_review**:

```sql
CREATE TABLE "media_review" (
  "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  "userId" integer NOT NULL,
  "mediaId" integer NOT NULL,
  "mediaType" varchar NOT NULL,
  "seasonNumber" integer,
  "rating" integer,
  "content" text,
  "containsSpoilers" boolean NOT NULL DEFAULT (0),
  "isPublic" boolean NOT NULL DEFAULT (1),
  "watchedAt" datetime,
  "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
  "updatedAt" datetime NOT NULL DEFAULT (datetime('now')),
  CONSTRAINT "FK_media_review_user" FOREIGN KEY ("userId")
    REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "FK_media_review_media" FOREIGN KEY ("mediaId")
    REFERENCES "media" ("id") ON DELETE CASCADE ON UPDATE NO ACTION
)
```

**Indexes**:

- `CREATE INDEX "IDX_media_review_mediaId" ON "media_review" ("mediaId")`
- `CREATE INDEX "IDX_media_review_isPublic" ON "media_review" ("isPublic")`
- `CREATE UNIQUE INDEX "UQ_media_review_user_media_season" ON "media_review" ("userId", "mediaId", "seasonNumber")`

**Nom du fichier**: Utiliser timestamp actuel (ex: `1737400000000-AddMediaTracking.ts`)

---

#### 3.2 Migration PostgreSQL: `server/migration/postgres/TIMESTAMP-AddMediaTracking.ts`

**Même structure mais syntaxe PostgreSQL**:

- `integer PRIMARY KEY AUTOINCREMENT` → `SERIAL NOT NULL` + `CONSTRAINT "PK_table" PRIMARY KEY ("id")`
- `datetime('now')` → `now()`
- `TIMESTAMP` au lieu de `datetime`
- `boolean NOT NULL DEFAULT (0)` → `boolean NOT NULL DEFAULT false`

---

## 📋 Checklist de validation

Avant de considérer l'étape terminée, vérifier :

### Entités

- [ ] `WatchHistory.ts` créé avec toutes les colonnes
- [ ] `MediaReview.ts` créé avec toutes les colonnes
- [ ] Relations ajoutées à `User.ts`
- [ ] Relations ajoutées à `Media.ts`
- [ ] Tous les decorators TypeORM corrects
- [ ] `DbAwareColumn` utilisé pour les dates
- [ ] Constructeur avec `Partial<T>` ajouté

### Migrations

- [ ] Migration SQLite créée avec timestamp unique
- [ ] Migration PostgreSQL créée avec même timestamp
- [ ] Tables créées avec tous les champs
- [ ] Foreign keys configurées avec CASCADE
- [ ] Indexes créés (simple + composés)
- [ ] Unique constraints ajoutés où nécessaire
- [ ] Méthode `down()` implémentée (rollback)

### Code Quality

- [ ] Imports corrects (pas de chemins relatifs complexes)
- [ ] Types importés depuis `@server/constants/media`
- [ ] Pas d'erreurs TypeScript
- [ ] Nommage cohérent avec le reste du projet
- [ ] Commentaires ajoutés si nécessaire

---

## 🚫 Ce qu'il NE FAUT PAS faire

- ❌ Ne pas créer les entités ReviewLike, ReviewComment, UserBadge (Phase 2)
- ❌ Ne pas créer de routes API (on les fera après)
- ❌ Ne pas modifier les permissions pour l'instant
- ❌ Ne pas toucher au frontend
- ❌ Ne pas utiliser de timestamps hardcodés (générer avec `Date.now()`)

---

## 📖 Références

### Documentation pertinente

- **Spec complète**: `FEATURE_TRACKING_REVIEWS.md`
- **Entité exemple**: `server/entity/DeletionRequest.ts`
- **Migration exemple**: `server/migration/sqlite/1764576699830-AddDeletionVoting.ts`
- **Relations TypeORM**: Voir `server/entity/User.ts` lignes 115-140

### Types existants à réutiliser

```typescript
import { MediaType } from '@server/constants/media';
// 'MOVIE' | 'TV'
```

### Utilitaires

```typescript
import { DbAwareColumn } from '@server/utils/DbColumnHelper';
// Pour colonnes datetime compatibles SQLite + PostgreSQL
```

---

## 🎯 Commande pour tester (après implémentation)

```bash
# Build TypeScript
pnpm build

# Générer les migrations (si TypeORM CLI configuré)
pnpm typeorm migration:generate -d server/datasource.ts AddMediaTracking

# Lancer les migrations
pnpm typeorm migration:run -d server/datasource.ts
```

---

## ✅ Succès attendu

Après cette étape, nous aurons :

1. ✅ 2 nouvelles entités TypeORM fonctionnelles
2. ✅ Relations bidirectionnelles avec User et Media
3. ✅ Migrations pour SQLite et PostgreSQL
4. ✅ Base de données prête pour l'ajout des routes API

**Next step**: Créer la première route API `POST /api/v1/media/:mediaId/watch`

---

_Dernière mise à jour: 2026-01-11_
