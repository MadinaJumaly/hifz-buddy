#!/usr/bin/env bash
# One-time server setup for HifzBuddy on Ubuntu (22.04 / 24.04).
# Run as your normal admin user (with sudo):   bash setup.sh
# Safe to run again: every step checks what's already done.
set -euo pipefail

REPO="${REPO:-git@github.com:MadinaJumaly/hifz-buddy.git}"
APP_DIR=/opt/hifzbuddy
DATA_DIR=/var/lib/hifzbuddy
SVC_USER=hifzbuddy
NODE_MAJOR=24

say() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }

say "Installing system packages"
sudo apt-get update -qq
sudo apt-get install -y -qq git sqlite3 curl ca-certificates build-essential python3 >/dev/null

if ! command -v node >/dev/null || [[ "$(node -v)" != v${NODE_MAJOR}* ]]; then
  say "Installing Node.js ${NODE_MAJOR}"
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | sudo -E bash - >/dev/null
  sudo apt-get install -y -qq nodejs >/dev/null
fi
echo "node $(node -v)"

say "Creating service user '${SVC_USER}'"
if ! id "$SVC_USER" >/dev/null 2>&1; then
  sudo useradd --system --create-home --home-dir "$DATA_DIR" --shell /usr/sbin/nologin "$SVC_USER"
fi
sudo install -d -o "$SVC_USER" -g "$SVC_USER" -m 750 "$DATA_DIR"
sudo install -d -o "$SVC_USER" -g "$SVC_USER" -m 700 "$DATA_DIR/.ssh"

# The repo is private: the server reads it with a read-only "deploy key"
KEY="$DATA_DIR/.ssh/id_ed25519"
if ! sudo test -f "$KEY"; then
  sudo -u "$SVC_USER" ssh-keygen -q -t ed25519 -N '' -C "hifzbuddy-server" -f "$KEY"
fi
sudo -u "$SVC_USER" sh -c "ssh-keyscan -q github.com >> '$DATA_DIR/.ssh/known_hosts' 2>/dev/null; sort -u -o '$DATA_DIR/.ssh/known_hosts' '$DATA_DIR/.ssh/known_hosts'"

if ! sudo -u "$SVC_USER" git ls-remote "$REPO" >/dev/null 2>&1; then
  say "Add this deploy key to GitHub, then run this script again"
  echo "GitHub → your repo → Settings → Deploy keys → Add deploy key"
  echo "Title: hifzbuddy-server   (leave 'Allow write access' OFF)"
  echo
  sudo cat "$KEY.pub"
  exit 0
fi

say "Getting the code"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo install -d -o "$SVC_USER" -g "$SVC_USER" "$APP_DIR"
  sudo -u "$SVC_USER" git clone -q "$REPO" "$APP_DIR"
else
  sudo -u "$SVC_USER" git -C "$APP_DIR" pull -q --ff-only
fi

say "Installing dependencies"
sudo -u "$SVC_USER" sh -c "cd '$APP_DIR' && npm ci --omit=dev --no-audit --no-fund --loglevel=error"

ENV_FILE="$APP_DIR/.env"
if ! sudo test -f "$ENV_FILE"; then
  say "Configuring .env"
  read -r -s -p "Bot token from @BotFather (input hidden): " BOT_TOKEN; echo
  read -r -p "Your Telegram user ID for daily backups (Enter to skip): " ADMIN_CHAT_ID
  sudo -u "$SVC_USER" tee "$ENV_FILE" >/dev/null <<EOF
BOT_TOKEN=${BOT_TOKEN}
DB_PATH=${DATA_DIR}/HifzBuddyBot.db
NODE_ENV=production
ADMIN_CHAT_ID=${ADMIN_CHAT_ID}
EOF
  sudo chmod 600 "$ENV_FILE"
fi

# Bring over an existing database (copied to ~/hifzbuddy.db) on first setup only
IMPORT="${IMPORT_DB:-$HOME/hifzbuddy.db}"
if [ -f "$IMPORT" ] && ! sudo test -f "$DATA_DIR/HifzBuddyBot.db"; then
  say "Importing existing database from $IMPORT"
  sudo install -o "$SVC_USER" -g "$SVC_USER" -m 600 "$IMPORT" "$DATA_DIR/HifzBuddyBot.db"
  sudo sqlite3 "$DATA_DIR/HifzBuddyBot.db" "SELECT COUNT(*) || ' users imported' FROM users;"
fi

say "Installing services"
sudo cp "$APP_DIR"/deploy/hifzbuddy.service "$APP_DIR"/deploy/hifzbuddy-backup.service "$APP_DIR"/deploy/hifzbuddy-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now hifzbuddy-backup.timer >/dev/null
sudo systemctl enable hifzbuddy >/dev/null
sudo systemctl restart hifzbuddy

sleep 3
say "Status"
sudo systemctl --no-pager --lines=8 status hifzbuddy || true
echo
echo "Logs:     sudo journalctl -u hifzbuddy -f"
echo "Update:   bash $APP_DIR/deploy/update.sh"
echo "Backup:   sudo systemctl start hifzbuddy-backup   (runs daily at 03:30 automatically)"
