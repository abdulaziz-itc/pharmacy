import os
import sys
import subprocess
from datetime import datetime

# Add the parent directory to the path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.config import settings

def backup_to_telegram():
    # Credentials
    bot_token = settings.TELEGRAM_BOT_TOKEN
    chat_id = settings.TELEGRAM_CHANNEL_ID
    
    if not bot_token or not chat_id:
        print("Error: TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID must be set in .env")
        return

    # DB Config
    db_name = settings.POSTGRES_DB
    db_user = settings.POSTGRES_USER
    db_pass = settings.POSTGRES_PASSWORD
    db_host = settings.POSTGRES_SERVER
    
    # Backup file name
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    backup_filename = f"backup_{db_name}_{timestamp}.sql.gz"
    backup_path = f"/tmp/{backup_filename}"
    
    try:
        print(f"Starting backup of {db_name}...")
        
        # Set PGPASSWORD for pg_dump
        env = os.environ.copy()
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
        caption = f"📂 Ko'zli zaxira nusxasi (Database Backup)\n📅 Sana: {datetime.now().strftime('%d.%m.%Y %H:%M')}\n🗄 Baza: {db_name}"
        
        curl_cmd = [
            "curl", "-s", "-X", "POST", url,
            "-F", f"document=@{backup_path}",
            "-F", f"chat_id={chat_id}",
            "-F", f"caption={caption}"
        ]
        
        result = subprocess.run(curl_cmd, capture_output=True, text=True)
        if result.returncode != 0 or '"ok":false' in result.stdout:
            print(f"Telegram API Error Details: {result.stdout} {result.stderr}")
            raise Exception("Telegram upload failed")
            
        print("Successfully sent to Telegram.")
        
    except Exception as e:
        print(f"Error during backup: {e}")
        # Notify via telegram even on failure if possible
        try:
            url_msg = f"https://api.telegram.org/bot{bot_token}/sendMessage"
            msg = f"❌ Xatolik: Database backup amalga oshmadi!\nError: {str(e)}"
            subprocess.run(["curl", "-s", "-X", "POST", url_msg, "-d", f"chat_id={chat_id}", "-d", f"text={msg}"], check=False)
        except:
            pass
    finally:
        # Cleanup
        if os.path.exists(backup_path):
            os.remove(backup_path)
            print("Temporary backup file removed.")

if __name__ == "__main__":
    backup_to_telegram()
