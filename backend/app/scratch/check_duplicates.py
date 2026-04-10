import os
import re

files_to_check = [
    "frontend/src/features/med-reps/components/ProductPlanCard.tsx",
    "frontend/src/features/counterparty-balance/CounterpartyBalancePage.tsx",
    "frontend/src/features/counterparty-balance/OrganizationFinancialCard.tsx",
    "frontend/src/features/counterparty-balance/TopUpModal.tsx",
    "frontend/src/features/doctors/DoctorsPage.tsx",
    "frontend/src/features/med-reps/MedRepDetailPage.tsx",
    "frontend/src/features/med-reps/MedRepsPage.tsx"
]

def check_duplicates(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    
    with open(filepath, 'r') as f:
        content = f.read()
        lines = content.split('\n')
        
    imports = [line for line in lines if line.startswith('import')]
    
    # Check for duplicate 'react' imports
    react_imports = [line for line in imports if "'react'" in line or '"react"' in line]
    if len(react_imports) > 1:
        print(f"DUPLICATE REACT IMPORTS in {filepath}:")
        for ri in react_imports:
            print(f"  {ri}")
            
    # Check for duplicate hook imports
    hooks = ['useState', 'useMemo', 'useEffect', 'useCallback']
    for hook in hooks:
        hook_lines = [line for line in imports if hook in line]
        if len(hook_lines) > 1:
            print(f"DUPLICATE HOOK '{hook}' in {filepath}:")
            for hl in hook_lines:
                print(f"  {hl}")

for f in files_to_check:
    check_duplicates(f)
