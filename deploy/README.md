# Deploying HifzBuddy

The bot runs on a small Ubuntu server as a system service: it starts on boot, restarts
itself if it crashes, and backs up the database every day (also to your Telegram).

Works on any Ubuntu 22.04 / 24.04 server. Below uses **Azure for Students**
(GitHub Student Developer Pack: $100 credit + a free B1s Linux VM for 12 months).

---

## 1. Create the server (Azure)

1. Activate **Azure for Students** (via the GitHub Student Developer Pack or azure.microsoft.com/free/students).
2. Azure Portal → **Create a resource → Virtual machine**:
   - **Resource group:** new, `hifzbuddy`
   - **Virtual machine name:** `hifzbuddy`
   - **Region:** a European region, e.g. *Germany West Central* or *West Europe* (close to Telegram's servers)
   - **Image:** *Ubuntu Server 24.04 LTS – x64 Gen2*
   - **Size:** *Standard_B1s* — pick the one marked **"Free services eligible"**
   - **Authentication:** SSH public key, username `azureuser`, *Generate new key pair*
   - **Inbound ports:** SSH (22) only
   - Leave the rest as default → **Review + create** → **Download private key**
3. Copy the VM's **Public IP address** from its overview page.

On your Mac (replace `IP` and the key file name):

```bash
chmod 600 ~/Downloads/hifzbuddy_key.pem
ssh -i ~/Downloads/hifzbuddy_key.pem azureuser@IP    # answer "yes" once, then exit
```

## 2. Stop the bot on your Mac and copy files over

Only one copy of the bot may run at a time. Stop the one on your Mac (Ctrl+C in its terminal), then:

```bash
cd ~/Local\ Documents/HifzBuddy_Bot
sqlite3 data/HifzBuddyBot.db ".backup hifzbuddy.db"          # consistent copy of your data
scp -i ~/Downloads/hifzbuddy_key.pem hifzbuddy.db deploy/setup.sh azureuser@IP:~
rm hifzbuddy.db
```

## 3. Run the setup on the server

```bash
ssh -i ~/Downloads/hifzbuddy_key.pem azureuser@IP
bash setup.sh
```

The first run installs Node.js and prints a **deploy key**. Add it on GitHub:
repo → **Settings → Deploy keys → Add deploy key** (title `hifzbuddy-server`, write access **off**).
Then run `bash setup.sh` again. It asks for:

- the **bot token** (from @BotFather)
- your **Telegram user ID** for daily backups (get it from @userinfobot), or Enter to skip

It imports `~/hifzbuddy.db`, starts the bot and shows its status. Send `/start` to the bot to check.

## Everyday commands (on the server)

| What | Command |
|---|---|
| Live logs | `sudo journalctl -u hifzbuddy -f` |
| Restart | `sudo systemctl restart hifzbuddy` |
| Status | `systemctl status hifzbuddy` |
| Deploy new code (after `git push`) | `bash /opt/hifzbuddy/deploy/update.sh` |
| Back up now | `sudo systemctl start hifzbuddy-backup` |
| List backups | `ls /var/lib/hifzbuddy/backups` |

Backups run daily at 03:30 (server time), keep the last 14 copies, and are also sent to
your Telegram if `ADMIN_CHAT_ID` is set in `/opt/hifzbuddy/.env`.

## Restoring a backup

```bash
sudo systemctl stop hifzbuddy
sudo install -o hifzbuddy -g hifzbuddy -m 600 /var/lib/hifzbuddy/backups/hifzbuddy-YYYY-MM-DD-HH-MM.db /var/lib/hifzbuddy/HifzBuddyBot.db
sudo rm -f /var/lib/hifzbuddy/HifzBuddyBot.db-wal /var/lib/hifzbuddy/HifzBuddyBot.db-shm
sudo systemctl start hifzbuddy
```

## After the free year

Make a backup, create a new Ubuntu server anywhere (e.g. Hetzner, ~€4/month), copy the
backup there as `~/hifzbuddy.db` together with `setup.sh`, and run step 3 again.
