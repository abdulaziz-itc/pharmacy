import urllib.request, json

req = urllib.request.Request("http://127.0.0.1:8000/api/v1/login/access-token", data=b"username=admin&password=admin", headers={'Content-Type': 'application/x-www-form-urlencoded'})
token = json.loads(urllib.request.urlopen(req).read())["access_token"]
print("Token:", token)

req2 = urllib.request.Request("http://127.0.0.1:8000/api/v1/sales/bonus-balance/?med_rep_id=15", headers={'Authorization': 'Bearer ' + token})
try:
    resp = urllib.request.urlopen(req2)
    print("STATUS 200")
    print(resp.read().decode())
except Exception as e:
    print("HTTPError:", e)
    if hasattr(e, 'read'):
        print(e.read().decode())
