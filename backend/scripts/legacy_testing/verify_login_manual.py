import urllib.request
import urllib.parse
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "http://localhost:8000/api/v1"

def test_login(username, password):
    logger.info(f"Testing login for user: {username}")
    url = f"{BASE_URL}/login/access-token"
    data = urllib.parse.urlencode({"username": username, "password": password}).encode()
    req = urllib.request.Request(url, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    
    try:
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                logger.info(f"✅ Login successful for {username}")
                return json.loads(response.read().decode())
            else:
                logger.error(f"❌ Login failed for {username}: {response.status}")
                return None
    except urllib.error.HTTPError as e:
        logger.error(f"❌ Login failed for {username}: {e.code} - {e.reason}")
        return None
    except Exception as e:
        logger.error(f"Error connecting to backend: {e}")
        return None

def main():
    logger.info("Starting login verification...")
    
    # Test admin
    admin_token = test_login("admin", "admin")
    
    # Test deputy_director
    deputy_token = test_login("deputy_director", "password")
    
    # Test botir (assuming password123 as per hierarchy script)
    botir_token = test_login("botir", "password123")
    
    # Test invalid password
    test_login("admin", "wrong_password")

    if admin_token and deputy_token:
        logger.info("Backend login verification PASSED for core roles")
    else:
        logger.error("Backend login verification FAILED for core roles")

if __name__ == "__main__":
    main()
