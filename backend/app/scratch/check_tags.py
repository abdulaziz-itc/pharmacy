import os
import re

files_to_check = [
    "frontend/src/features/med-reps/MedRepDetailPage.tsx",
    "frontend/src/features/med-reps/components/ProductPlanCard.tsx",
    "frontend/src/features/med-reps/MedRepsPage.tsx",
    "frontend/src/features/counterparty-balance/CounterpartyBalancePage.tsx",
    "frontend/src/features/counterparty-balance/OrganizationFinancialCard.tsx",
    "frontend/src/features/counterparty-balance/TopUpModal.tsx",
    "frontend/src/features/doctors/DoctorsPage.tsx",
    "frontend/src/features/invoices/InvoicesPage.tsx"
]

def check_tags(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    
    with open(filepath, 'r') as f:
        content = f.read()

    # Find all opening tags (simple regex)
    tags_started = re.findall(r'<([A-Z][a-zA-Z0-9\.]+|motion\.[a-z]+)', content)
    # Find all closing tags
    tags_ended = re.findall(r'</([A-Z][a-zA-Z0-9\.]+|motion\.[a-z]+)', content)
    # Find all self-closing tags
    self_closing = re.findall(r'<([A-Z][a-zA-Z0-9\.]+|motion\.[a-z]+)[^>]*/>', content)

    print(f"\nChecking tags for {filepath}:")
    all_started = {}
    for t in tags_started:
        all_started[t] = all_started.get(t, 0) + 1
        
    for t in self_closing:
        all_started[t] = all_started.get(t, 0) - 1
        
    all_ended = {}
    for t in tags_ended:
        all_ended[t] = all_ended.get(t, 0) + 1
        
    for t in all_started:
        if all_started[t] != all_ended.get(t, 0):
            print(f"  MISMATCH for {t}: Started {all_started[t]}, Ended {all_ended.get(t, 0)}")

for f in files_to_check:
    check_tags(f)
