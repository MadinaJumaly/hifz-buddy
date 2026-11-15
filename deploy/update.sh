#!/usr/bin/env bash
# Deploy the latest code from GitHub: pull, install dependencies, restart.
# Run on the server:   bash /opt/hifzbuddy/deploy/update.sh
set -euo pipefail

APP_DIR=/opt/hifzbuddy
SVC_USER=hifzbuddy

sudo -u "$SVC_USER" git -C "$APP_DIR" pull --ff-only
sudo -u "$SVC_USER" sh -c "cd '$APP_DIR' && npm ci --omit=dev --no-audit --no-fund --loglevel=error"

# Service files may have changed too
sudo cp "$APP_DIR"/deploy/hifzbuddy.service "$APP_DIR"/deploy/hifzbuddy-backup.service "$APP_DIR"/deploy/hifzbuddy-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart hifzbuddy

sleep 3
sudo systemctl --no-pager --lines=8 status hifzbuddy
