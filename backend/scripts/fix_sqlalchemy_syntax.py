
import re
import os

files_to_fix = [
    "backend/app/api/v1/endpoints/analytics.py",
    "backend/app/api/v1/endpoints/reports.py"
]

def fix_case_syntax(content):
    # Regex to find: case((cond, val), else_=
    # and replace with: case(cond, val, else_=
    # Pattern explanation: 
    # find case( ( something , something ) , else_=
    
    # Simple regex for the specific lines seen in logs:
    # reports.py: case((BonusLedger.ledger_type == "accrual", BonusLedger.amount), else_=0)
    # analytics.py: func.case((ReservationItem.salary_amount > 0, ReservationItem.salary_amount), else_=func.coalesce(Product.salary_expense, 0))
    
    # Recursive/Complex regex is hard, let's do targeted replaces for known patterns
    
    # Pattern 1: case((..., ...), else_=...)
    new_content = re.sub(r'case\(\(([^,]+),\s*([^)]+)\),\s*else_=', r'case(\1, \2, else_=', content)
    
    return new_content

for file_path in files_to_fix:
    if not os.path.exists(file_path):
        print(f"Skipping {file_path}, not found.")
        continue
        
    with open(file_path, 'r') as f:
        old_content = f.read()
    
    new_content = fix_case_syntax(old_content)
    
    if old_content != new_content:
        with open(file_path, 'w') as f:
            f.write(new_content)
        print(f"✅ Fixed syntax in {file_path}")
    else:
        print(f"ℹ️ No changes needed in {file_path}")

print("Migration complete.")
