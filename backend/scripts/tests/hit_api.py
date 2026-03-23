import requests
import json
import traceback

def hit_api():
    try:
        # Load token
        with open('token2.txt', 'r') as f:
            token = f.read().strip()
        
        # Hit the API
        url = "http://localhost:8000/api/v1/crm/med-orgs/?limit=10000"
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get(url, headers=headers)
        print(f"Status Code: {resp.status_code}")
        print(f"Response Body: {resp.text}")
        
    except Exception as e:
        traceback.print_exc()

if __name__ == "__main__":
    hit_api()
