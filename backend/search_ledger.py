import os
import sys

def search_files(directory, keyword):
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.py'):
                with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                    content = f.read()
                    if keyword in content:
                        print(f"Found in {os.path.join(root, file)}")

search_files('/Users/macbook13/Documents/pharma_new/backend/app', 'BonusLedger')
