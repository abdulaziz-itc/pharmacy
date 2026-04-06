
import sqlalchemy
from sqlalchemy import case, literal
print(f"SQLAlchemy version: {sqlalchemy.__version__}")

try:
    c = case((literal(True), 1), else_=0)
    print("case((cond, val), else_=0) SUCCESS")
except Exception as e:
    print(f"case((cond, val), else_=0) FAILED: {e}")

try:
    c = case([(literal(True), 1)], else_=0)
    print("case([(cond, val)], else_=0) SUCCESS")
except Exception as e:
    print(f"case([(cond, val)], else_=0) FAILED: {e}")
