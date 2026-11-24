# HifzBuddy

A Telegram bot ([@HifzBuddyBot](https://t.me/HifzBuddyBot)) for tracking Quran memorization (hifz).
Available in **English**, **Русский** and **Қазақша**.

## Features

- **Onboarding** — pick a language, confirm your name, choose your city (for prayer-time-aware reminders) and mark the surahs you already know.
- **Logging** — record what you memorized by sending text like `112` or `2 255 257` (surah + ayah range), or use `/log` and `/partial`.
- **Progress card** — a shareable 1080×1350 image of your progress, rendered from SVG to PNG.
- **My heart** — a Quran-heart illustration with one tile per surah. Fully memorized surahs glow gold; partial ones fill from the bottom.
- **Memorized list** — a paged list of surahs, where you can unmark any of them.
- **Reminders** — a daily reminder at a time you choose.
- **Friend & teacher links** — pair with a friend or a teacher so they can follow your progress. The link owner accepts or rejects each request.
- **Inline sharing** — share your progress card to any chat through inline mode.
- **Daily backups** — the SQLite database is backed up every day and sent to the admin on Telegram.

## Commands

| Command | What it does |
| --- | --- |
| `/menu` | Show the main menu |
| `/log`, `/partial` | Log memorized surahs or part of a surah |
| `/progress` | Show your progress card |
| `/memorized` | List and edit memorized surahs |
| `/heart` | Show the "My heart" card |
| `/reminder` | Set the daily reminder |
| `/settings` | Name, city, language and other settings |
| `/genfriend`, `/genteacher` | Create a link for a friend or a teacher |
| `/resetlink`, `/unpair` | Reset your link or remove a pairing |

## Tech stack

- Node.js 20+ (ES modules)
- [Telegraf](https://telegraf.js.org/) 4
- SQLite via [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (WAL mode); the schema migrates automatically on startup
- [node-cron](https://github.com/node-cron/node-cron) for reminders and backups
- [@resvg/resvg-js](https://github.com/yisibl/resvg-js) to render SVG cards to PNG
- [suncalc](https://github.com/mourner/suncalc) for sun-based timing

## Getting started

1. Create a bot with [@BotFather](https://t.me/BotFather) and copy the token. Turn on **inline mode** if you want sharing to work.
2. Install and configure:

   ```bash
   npm install
   cp .env.example .env   # then fill in BOT_TOKEN
   ```

3. Run it:

   ```bash
   npm run dev     # restarts on file changes
   npm start       # plain start
   ```

> Only one process can poll Telegram per bot token. Don't run the bot locally with the production token while the server is running.

### Configuration

Set these in `.env`:

| Variable | Required | Description |
| --- | --- | --- |
| `BOT_TOKEN` | yes | Token from @BotFather |
| `DB_PATH` | no | SQLite file path (default `./data/HifzBuddyBot.db`) |
| `NODE_ENV` | no | `production` on the server |
| `ADMIN_CHAT_ID` | no | Your Telegram user ID; the daily backup is sent here |
| `BACKUP_DIR` | no | Backup folder (default: `backups` next to the database) |
| `BACKUP_KEEP` | no | Number of backups to keep (default `14`) |

### Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start with file watching |
| `npm start` | Start the bot |
| `npm run migrate` | Run database migrations manually |
| `npm run backup` | Back up the database and send it to `ADMIN_CHAT_ID` |
| `node scripts/heart-labels.js` | Recompute Arabic name placement in the heart tiles (slow, run after editing the tiles) |

## Project structure

```
src/
  index.js        Bot wiring: commands, actions, text handlers, launch
  handlers/       Feature handlers (start, log, progress, memorized, settings, pairing, reminder, share)
  services/       Database, migrations, card and heart rendering, reminders
  middleware/     Loads the user for each update
  data/           Surah, juz and city data; heart tile geometry
  utils/          i18n, menu, progress and time helpers
locales/          en.js, ru.js, kz.js
migrations/       SQL schema and runner
assets/fonts/     Fonts used for the cards (all OFL)
scripts/          Backup and heart-label tools
deploy/           Server setup scripts and systemd units
```

## Deployment

The bot runs as a systemd service on a small Ubuntu server, with a daily backup timer.
See [deploy/README.md](deploy/README.md) for a step-by-step guide (Azure walkthrough included).

To update a running server after pushing changes:

```bash
bash /opt/hifzbuddy/deploy/update.sh
```

## Credits

- Fonts: Inter, Playfair Display and Amiri, all under the SIL Open Font License (see `assets/fonts`).
- The heart illustration is used under license and is not covered by this repository's license.

## License

ISC
