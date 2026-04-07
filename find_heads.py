
import os
import re

def find_heads():
    versions_dir = 'backend/alembic/versions'
    files = [f for f in os.listdir(versions_dir) if f.endswith('.py')]
    
    nodes = {}
    edges = {} # down_rev -> [up_revs]
    
    for f in files:
        with open(os.path.join(versions_dir, f), 'r') as file:
            content = file.read()
            rev_match = re.search(r"revision: str = '([^']+)'", content)
            down_match = re.search(r"down_revision: Union\[str, Sequence\[str\], None\] = '([^']+)'", content)
            
            if rev_match:
                rev = rev_match.group(1)
                down_rev = down_match.group(1) if down_match else None
                nodes[rev] = f
                if down_rev:
                    if down_rev not in edges:
                        edges[down_rev] = []
                    edges[down_rev].append(rev)

    heads = [rev for rev in nodes if rev not in edges]
    print(f"Heads found: {heads}")
    for h in heads:
        print(f"  {h} -> {nodes[h]}")

if __name__ == "__main__":
    find_heads()
