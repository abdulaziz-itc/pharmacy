#!/bin/bash
TOKEN=$(grep -o "token':'[^']*'" frontend/src/store/authStore.ts | cut -d"'" -f3 || echo "")
echo "Testing /crm/doctors/"
curl -s -w "\n%{http_code}\n" http://localhost:8000/api/v1/crm/doctors/ -H "Authorization: Bearer $TOKEN"
echo "Testing /crm/med-orgs/"
curl -s -w "\n%{http_code}\n" http://localhost:8000/api/v1/crm/med-orgs/ -H "Authorization: Bearer $TOKEN"
echo "Testing /warehouses/"
curl -s -w "\n%{http_code}\n" http://localhost:8000/api/v1/warehouses/ -H "Authorization: Bearer $TOKEN"
