# Plan: Mark Season as Watched

## Objectif
Permettre aux utilisateurs de marquer manuellement une saison comme vue sans polluer les stats communautaires.

## Modifications

### 1. Entity WatchHistory - Ajouter `isManual`

**Fichier:** `server/entity/WatchHistory.ts`

```typescript
@Column({ type: 'boolean', default: false })
public isManual: boolean;
```

### 2. Migrations

**Fichiers:**
- `server/migration/sqlite/1737600000000-AddWatchHistoryIsManual.ts`
- `server/migration/postgres/1737600000000-AddWatchHistoryIsManual.ts`

Ajoute la colonne `isManual` boolean default false.

### 3. Service - Créer méthode `markSeasonAsWatched`

**Fichier:** `server/lib/watchHistoryService.ts` (ou nouveau fichier)

```typescript
async markSeasonAsWatched(
  userId: number,
  tmdbId: number,
  seasonNumber: number,
  watchedAt?: Date
): Promise<void> {
  // 1. Fetch season details from TMDB (get episode list)
  // 2. For each episode:
  //    - Check if already in watch_history
  //    - If not, create entry with isManual = true
  // 3. Update series progress (existing logic)
  // NOTE: Ne pas appeler badgeService
}
```

### 4. API Route

**Fichier:** `server/routes/tracking.ts`

```typescript
// POST /api/v1/tracking/series/:tmdbId/mark-season
router.post('/series/:tmdbId/mark-season', async (req, res) => {
  const { tmdbId } = req.params;
  const { seasonNumber, watchedAt } = req.body;
  // Appelle markSeasonAsWatched
});
```

### 5. Modifier les requêtes "Most Viewed"

**Fichiers à vérifier:**
- `server/routes/media.ts` (ou similaire)
- Toute requête qui agrège des stats communautaires

Ajouter `WHERE isManual = false` pour exclure les marquages manuels.

### 6. Frontend - Bouton sur chaque saison

**Fichier:** `src/components/TvDetails/Season.tsx`

Ajouter un bouton "Mark as watched" qui:
- Appelle l'API
- Refresh les données de progression
- Affiche un toast de confirmation

### 7. Frontend - Hook

**Fichier:** `src/hooks/useMarkSeasonWatched.ts`

```typescript
export const useMarkSeasonWatched = () => {
  const markAsWatched = async (tmdbId: number, seasonNumber: number) => {
    await axios.post(`/api/v1/tracking/series/${tmdbId}/mark-season`, {
      seasonNumber,
    });
  };
  return { markAsWatched };
};
```

## Ce qui n'est PAS affecté

- **Badges** - markSeasonAsWatched n'appelle pas badgeService
- **Temps de visionnage** - Basé sur sessions Jellyfin, pas watch_history
- **Stats communautaires** - Filtrées avec `isManual = false`

## Ce qui EST affecté

- **Series progress** - Recalculé normalement (compte tous les épisodes)
- **Stats utilisateur (épisodes vus)** - Compte tous les épisodes (manual ou pas)
- **Historique personnel** - Montre tous, mais pourrait afficher un badge "manual"

## Questions ouvertes

1. Faut-il aussi permettre "Unmark season" pour annuler ?
2. Faut-il un modal de confirmation ou action directe ?
3. Faut-il permettre de choisir la date de visionnage ?
