import requests
import json

try:
    auth_resp = requests.post("http://127.0.0.1:8000/api/v1/login/access-token", data={"username": "admin", "password": "admin"})
    token = auth_resp.json()["access_token"]
    resp = requests.get("http://127.0.0.1:8000/api/v1/sales/bonus-balance/?med_rep_id=15", headers={"Authorization": f"Bearer {token}"})
    print("STATUS:", resp.status_code)
    print("TEXT:", resp.text)
except Exception as e:
    print("ERR:", str(e))
