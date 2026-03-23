import urllib.request
import urllib.parse
import json

# Login to get token
url = "http://localhost:8000/api/v1/login/access-token"
data = urllib.parse.urlencode({"username": "admin", "password": "admin_password"}).encode("utf-8")
req = urllib.request.Request(url, data=data)
with urllib.request.urlopen(req) as response:
    token = json.loads(response.read().decode())["access_token"]

# Setup payload for allocate-bonus
allocate_url = "http://localhost:8000/api/v1/sales/allocate-bonus/"
payload = {
    "doctor_id": 1,
    "product_id": None,
    "amount": 25000,
    "target_month": 3,
    "target_year": 2026,
    "notes": "Test bonus allocation"
}
payload_bytes = json.dumps(payload).encode("utf-8")
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

req = urllib.request.Request(allocate_url, data=payload_bytes, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        print("Success:", response.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTP ERROR {e.code}:")
    print(e.read().decode())
