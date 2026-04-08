import os
import sys
import subprocess
import requests
import time
import argparse
from datetime import datetime
from pathlib import Path

# Add the parent directory to the path so we can import app
# This script is at backend/app/scripts/db_backup_telegram.py
# Parent (scripts) -> Grandparent (app) -> Great-grandparent (backend)
BASE_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.append(str(BASE_DIR))

# Try to load environment variables from .env if possible
def load_env_manually():
    # Common locations for .env on cPanel and local dev
    env_paths = [
        BASE_DIR / "backend" / ".env",   # Likely location based on search
        BASE_DIR / "app" / ".env",
        BASE_DIR / ".env",
        Path.cwd() / ".env",
        Path.cwd() / "backend" / "backend" / ".env" # Another common cPanel structure
    ]
    
    for path in env_paths:
        if path.exists():
            print(f"Loading environment from {path}")
            with open(path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    if '=' in line:
                        key, value = line.split('=', 1)
                        os.environ.setdefault(key.strip(), value.strip())
            return True
    return False

# Now we can import settings after (potentially) loading env
try:
    from app.core.config import settings
except ImportError:
    # Fallback if app is not in path correctly
    settings = None

def get_config(key, default=None):
    # Try settings first, then os.environ, then default
    if settings and hasattr(settings, key):
        val = getattr(settings, key)
        if val: return val
    return os.environ.get(key, default)

def backup_to_telegram():
    # Get credentials from env or settings
    load_env_manually()
    
    bot_token = get_config("TELEGRAM_BOT_TOKEN")
    chat_id = get_config("TELEGRAM_CHANNEL_ID")
    
    if not bot_token or not chat_id:
        print("Error: TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID must be set in .env")
        return False

    # DB Config
    db_name = get_config("POSTGRES_DB", "pharma_db")
    db_user = get_config("POSTGRES_USER", "macbook13")
    db_pass = get_config("POSTGRES_PASSWORD", "")
    db_host = get_config("POSTGRES_SERVER", "localhost")
    
    # Backup file name
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_filename = f"backup_{db_name}_{timestamp}.sql.gz"
    backup_path = f"/tmp/{backup_filename}"
    
    try:
        print(f"[{datetime.now().strftime('%H:%M:%S')}] Starting backup of {db_name}...")
        
        # Set PGPASSWORD for pg_dump
        env = os.environ.copy()
        if db_pass:
            env["PGPASSWORD"] = db_pass
        
        # Run pg_dump
        dump_cmd = [
            "pg_dump",
            "-h", db_host,
            "-U", db_user,
            "-Z", "9", # Max compression
            "-f", backup_path,
            db_name
        ]
        
        subprocess.run(dump_cmd, env=env, check=True)
        print(f"Backup created at {backup_path}")
        
        # Send to Telegram
        print("Sending to Telegram...")
        url = f"https://api.telegram.org/bot{bot_token}/sendDocument"
        
        with open(backup_path, 'rb') as f:
            files = {'document': f}
            data = {
                'chat_id': chat_id,
                'caption': f"📂 Ko'zli zaxira nusxasi (Database Backup)\n📅 Sana: {datetime.now().strftime('%d.%m.%Y %H:%M')}\n🗄 Baza: {db_name}\n🚀 Muhit: Server (cPanel)"
            }
            response = requests.post(url, data=data, files=files)
            if response.status_code != 200:
                print(f"Telegram API Error Details: {response.text}")
            response.raise_for_status()
            
        print("Successfully sent to Telegram.")
        return True
        
    except Exception as e:
        error_msg = str(e)
        print(f"Error during backup: {error_msg}")
        # Notify via telegram even on failure if possible
        try:
             requests.post(f"https://api.telegram.org/bot{bot_token}/sendMessage", data={
                 'chat_id': chat_id,
                 'text': f"❌ Xatolik: Database backup amaлгa oшмaди!\nError: {error_msg}"
             })
        except:
            pass
        return False
    finally:
        # Cleanup
        if os.path.exists(backup_path):
            os.remove(backup_path)
            print("Temporary backup file removed.")

def main():
    parser = argparse.ArgumentParser(description="Database Backup to Telegram")
    parser.add_argument("--interval", type=int, default=0, help="Interval in hours (0 to run once)")
    args = parser.parse_args()

    if args.interval > 0:
        print(f"Starting backup service. Interval: {args.interval} hour(s).")
        while True:
            backup_to_telegram()
            print(f"Sleeping for {args.interval} hour(s)...")
            time.sleep(args.interval * 3600)
    else:
        # Check if we should default to 2 hours if no arg but loop is intended
        # Actually, for 2-hour requirement, let's just make it default to 2 if --loop is passed
        # But simple once run is better for testing.
        backup_to_telegram()

if __name__ == "__main__":
    main()
