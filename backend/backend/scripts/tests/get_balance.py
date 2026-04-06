import json
import urllib.request
import urllib.parse
from urllib.error import HTTPError

def main():
    try:
        # Login
        data = urllib.parse.urlencode({'username': 'admin', 'password': 'admin'}).encode()
        req = urllib.request.Request('http://127.0.0.1:8000/api/v1/login/access-token', data=data)
        resp = urllib.request.urlopen(req)
        token = json.loads(resp.read())['access_token']
        print("Got token")
        
        # Request Balance
        req2 = urllib.request.Request('http://127.0.0.1:8000/api/v1/sales/bonus-balance/?med_rep_id=15')
        req2.add_header('Authorization', f'Bearer {token}')
        
        with urllib.request.urlopen(req2) as resp2:
            print("HTTP 200")
            print(resp2.read().decode())
    except HTTPError as e:
        print(f"HTTP Error {e.code}")
        try:
            print(e.read().decode())
        except:
            print("Could not read error body")
    except Exception as e:
        print("Error:", e)

if __name__ == '__main__':
    main()
