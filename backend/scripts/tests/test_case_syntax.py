
from sqlalchemy import case, func, Column, Integer, String
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class TestTable(Base):
    __tablename__ = 'test'
    id = Column('id', Integer, primary_key=True)
    type = Column('type', String)
    amount = Column('amount', Integer)

def test_syntax():
    print("Testing SQLAlchemy case syntax...")
    # Style 1: tuple wrapped in positional (Legacy 1.4-compatible in 2.0?)
    # The error message said: "passed as a series of positional elements, rather than as a list"
    
    try:
        # Style A: case((cond, res), else_=val)
        c1 = case((TestTable.type == "accrual", TestTable.amount), else_=0)
        print("✅ Style A (case((cond, res), else_=0)) worked")
    except Exception as e:
        print(f"❌ Style A (case((cond, res), else_=0)) failed: {e}")

    try:
        # Style B: case(cond, res, else_=val) - THIS IS POSITIONAL ELEMENTS
        c2 = case(TestTable.type == "accrual", TestTable.amount, else_=0)
        print("✅ Style B (case(cond, res, else_=0)) worked")
    except Exception as e:
        print(f"❌ Style B (case(cond, res, else_=0)) failed: {e}")

    try:
        # Style C: case([(cond, res)], else_=val) - Legacy LIST
        c3 = case([(TestTable.type == "accrual", TestTable.amount)], else_=0)
        print("✅ Style C (case([(cond, res)], else_=0)) worked")
    except Exception as e:
        print(f"❌ Style C (case([(cond, res)], else_=0)) failed: {e}")

if __name__ == "__main__":
    test_syntax()
