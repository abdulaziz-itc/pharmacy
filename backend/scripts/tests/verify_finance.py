import requests
import json

def test_finance():
    base_url = "http://localhost:8000/api/v1/finance"
    
    # We expect 401 if not logged in, but we want to see if it Crashes (500)
    endpoints = ["/debtors", "/stats"] # Removed KPI as it needs ID
    
    for ep in endpoints:
        try:
            print(f"Testing {ep}...")
            resp = requests.get(base_url + ep)
            print(f"Status: {resp.status_code}")
            if resp.status_code == 500:
                print(f"ERROR: 500 on {ep}")
                print(resp.text)
            else:
                print(f"OK (or 401/403 as expected): {resp.status_code}")
        except Exception as e:
            print(f"Failed to hit {ep}: {e}")

if __name__ == "__main__":
    test_finance()
