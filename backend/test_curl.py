import urllib.request
import urllib.parse
import json

url = "http://localhost:8000/api/v1/login/access-token"
data = urllib.parse.urlencode({"username": "admin", "password": "admin_password"}).encode("utf-8")
req = urllib.request.Request(url, data=data)
with urllib.request.urlopen(req) as response:
    token = json.loads(response.read().decode())["access_token"]

balance_url = "http://localhost:8000/api/v1/sales/bonus-balance/?med_rep_id=15"
req = urllib.request.Request(balance_url, headers={"Authorization": f"Bearer {token}"})
try:
    with urllib.request.urlopen(req) as response:
        print(response.read().decode())
except urllib.error.HTTPError as e:
    print(f"HTTP {e.code}: {e.read().decode()}")
