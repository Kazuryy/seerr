<div align="center">

# 🎬 Seerr - Custom Fork by Kazury

[![Docker Pulls](https://img.shields.io/docker/pulls/kazuryy/seerr)](https://hub.docker.com/r/kazuryy/seerr)
[![GitHub Release](https://img.shields.io/github/v/tag/Kazuryy/seerr?label=release)](https://github.com/Kazuryy/seerr/releases)
[![License](https://img.shields.io/github/license/Kazuryy/seerr)](https://github.com/Kazuryy/seerr/blob/main/LICENSE)

**A community-enhanced fork of Seerr featuring democratic media deletion voting**

</div>

---

## 🌟 What is This Fork?

This is a custom fork of [Seerr](https://github.com/seerr-team/seerr) (formerly Jellyseerr) that adds a **community-driven deletion voting system**. Users can democratically vote to remove media from your library based on configurable thresholds.

### 🆕 Custom Features (v1.0.0-kazury)

#### 🗳️ Community Deletion Voting System

- **Democratic Media Removal**: Users can vote on deletion requests for unwatched or unpopular media
- **Configurable Thresholds**: Admins set vote requirements (e.g., 5 votes = auto-delete)
- **Vote Tracking**: Complete history of who voted and when
- **Automatic Execution**: Media automatically removed when threshold is reached
- **Admin Controls**: Full deletion settings management in admin panel

#### 🔔 Enhanced Notifications

- **Discord Integration**: Deletion event notifications with rich embeds
- **Vote Milestones**: Alerts when deletion requests reach vote thresholds
- **Execution Alerts**: Notifications when media is deleted via voting
- **Configurable**: Customize which deletion events trigger notifications

#### 🎨 UI Enhancements

- **Deletion Request Cards**: Beautiful card-based UI for viewing deletion requests
- **Deletion Slider**: Discover page integration showing active deletion requests
- **Settings Page**: Dedicated deletion configuration panel (`/settings/deletion`)
- **User Dashboard**: Track your deletion votes and requests
- **Badge System**: Visual indicators for deletion status

#### 🛠️ Technical Improvements

- **Database Foundation**: Robust `DeletionRequest` entity with comprehensive tracking
- **Job Processor**: Background job for processing vote thresholds
- **API Routes**: RESTful endpoints for all deletion operations
- **Service Layer**: Clean service architecture for deletion logic
- **TypeScript**: Fully typed deletion system

---

## 📦 Quick Start

### Docker (Recommended)

```bash
docker run -d \
  --name seerr \
  -e TZ=Europe/Paris \
  -p 5055:5055 \
  -v /path/to/config:/app/config \
  kazuryy/seerr:latest
```

### Docker Compose

```yaml
version: '3'
services:
  seerr:
    image: kazuryy/seerr:latest
    container_name: seerr
    environment:
      - TZ=Europe/Paris
    ports:
      - 5055:5055
    volumes:
      - ./config:/app/config
    restart: unless-stopped
```

### Available Docker Tags

- `latest` - Latest stable release
- `v1.0.0-kazury` - First stable release with deletion voting
- `deletion-voting` - Development tag for deletion feature

---

## 🔧 Configuration

### Setting Up Deletion Voting

1. Navigate to **Settings → Deletion** (`/settings/deletion`)
2. Enable deletion voting system
3. Configure vote threshold (default: 5 votes)
4. Set auto-deletion timer (optional)
5. Configure notification preferences

### Notification Setup

To receive deletion alerts via Discord:

1. Go to **Settings → Notifications → Discord**
2. Enable Discord webhook
3. Check "Deletion Vote Threshold" and "Deletion Executed" events
4. Save settings

---

## 🎯 Use Cases

### Community Management

Perfect for shared media servers where users want input on library cleanup:

- Remove unwatched shows taking up space
- Democratic decision-making on content removal
- Prevent admin burnout from cleanup requests

### Space Optimization

Automatically clean up media based on community feedback:

- Let users vote on removing old/unwatched content
- Configurable thresholds prevent abuse
- Notifications keep everyone informed

---

## 📊 Differences from Upstream Seerr

| Feature                    | Upstream Seerr | This Fork   |
| -------------------------- | -------------- | ----------- |
| Media Requests             | ✅             | ✅          |
| User Management            | ✅             | ✅          |
| Notifications              | ✅             | ✅ Enhanced |
| **Deletion Voting**        | ❌             | ✅ **NEW**  |
| **Vote Thresholds**        | ❌             | ✅ **NEW**  |
| **Deletion Notifications** | ❌             | ✅ **NEW**  |
| **Deletion Dashboard**     | ❌             | ✅ **NEW**  |

---

## 🤝 Contributing

This fork maintains compatibility with upstream Seerr. Contributions are welcome!

### Development

```bash
# Clone the repository
git clone https://github.com/Kazuryy/seerr.git
cd seerr

# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build
```

### Branches

- `main` - Stable production releases (tagged)
- `develop` - Tracks upstream Seerr develop
- `feat/deletion-database-foundation` - Active development of deletion features

---

## 🔄 Upstream Sync

This fork is regularly synced with [seerr-team/seerr](https://github.com/seerr-team/seerr) to include the latest features and bug fixes from the main project.

**Based on**: Seerr develop branch (formerly Jellyseerr)

---

## 📝 Original Seerr Features

All original Seerr features are preserved:

- Full Jellyfin/Emby/Plex integration including authentication
- Support for **PostgreSQL** and **SQLite** databases
- Movie, TV Show, and Mixed Library support
- Sonarr and Radarr integration
- Library scanning and availability tracking
- Customizable request system
- Granular permission system
- Mobile-friendly design
- Watchlist & blacklist support

For complete documentation, see the [official Seerr docs](https://docs.seerr.dev).

---

## 📚 Documentation

- [Official Seerr Documentation](https://docs.seerr.dev)
- [API Documentation](http://localhost:5055/api-docs) (after installation)
- [Deletion Voting Guide](https://github.com/Kazuryy/seerr/wiki/Deletion-Voting) _(coming soon)_

---

## 💬 Support

### For This Fork

- [GitHub Issues](https://github.com/Kazuryy/seerr/issues) - Bug reports & feature requests
- [GitHub Discussions](https://github.com/Kazuryy/seerr/discussions) - Questions & ideas

### For Upstream Seerr

- [Seerr Documentation](https://docs.seerr.dev)
- [Seerr Discord](https://discord.gg/seerr)
- [Upstream GitHub](https://github.com/seerr-team/seerr)

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

This is a fork of [Seerr](https://github.com/seerr-team/seerr), which merged Overseerr and Jellyseerr.

---

## ⭐ Acknowledgments

- **Seerr Team** - For the amazing base application
- **Jellyseerr Contributors** - For the Jellyfin/Emby support
- **Overseerr Contributors** - For the original request management system

---

<div align="center">

**Made with ❤️ by [Kazury](https://github.com/Kazuryy)**

If you find this fork useful, consider starring ⭐ the repository!

</div>
