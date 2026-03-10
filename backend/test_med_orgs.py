from fastapi.testclient import TestClient
from app.main import app
from app.api.deps import get_current_active_user
from app.models.user import User

# mock authentication
async def override_get_current_active_user():
    return User(id=1, is_active=True, role="director")

app.dependency_overrides[get_current_active_user] = override_get_current_active_user

client = TestClient(app)

response = client.get("/api/v1/crm/med-orgs/?limit=10000")
print("Response code:", response.status_code)
if response.status_code != 200:
    print("Response text:", response.text)
