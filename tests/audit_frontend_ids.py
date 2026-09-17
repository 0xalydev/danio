"""
Frontend audit: cross-checks every getElementById() reference in the JS files
against the element IDs that actually exist in the HTML pages.

A missing ID means a null element — if any of that code is unguarded inside
the DOMContentLoaded callback, it throws and kills ALL later initialization
(WebSocket, sim, HUD). Run: python tests/audit_frontend_ids.py
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WEB = ROOT / "web"
FAILURES = []


def check(label, cond, detail=""):
    print(("PASS" if cond else "FAIL") + f" | {label}" + (f" -> {detail}" if detail else ""))
    if not cond:
        FAILURES.append(label)


def js_id_refs(*files):
    ids = set()
    for f in files:
        src = (WEB / f).read_text(encoding="utf-8")
        ids |= set(re.findall(r"getElementById\(['\"]([A-Za-z0-9_-]+)['\"]\)", src))
    return ids


def html_ids(text):
    return set(re.findall(r'id="([A-Za-z0-9_-]+)"', text)) | set(
        re.findall(r"id='([A-Za-z0-9_-]+)'", text)
    )


# 1. index.html vs main JS files
html = (WEB / "index.html").read_text(encoding="utf-8")
html_ids_set = html_ids(html)
js_ids = js_id_refs("app.js", "hero_organism.js", "connectome_graph.js", "connecto_sim.js")
missing = sorted(js_ids - html_ids_set)
check("all main-page JS element IDs exist in index.html",
      not missing, f"missing={missing}" if missing else f"{len(js_ids)} refs OK")

# 2. inline scripts in subpages must reference IDs that exist in their own page
for page in ["dino.html", "fizzbuzz.html", "journal.html", "roam.html"]:
    text = (WEB / page).read_text(encoding="utf-8")
    scripts = re.findall(r"<script>(.*?)</script>", text, re.S)
    ids = set()
    for s in scripts:
        ids |= set(re.findall(r"getElementById\(['\"]([A-Za-z0-9_-]+)['\"]\)", s))
    miss = sorted(ids - html_ids(text))
    check(f"{page}: all {len(ids)} inline JS IDs exist", not miss,
          f"missing={miss}" if miss else f"{len(scripts)} script block(s)")

# 3. script load order on index.html: class files must load BEFORE app.js
order = re.findall(r'<script src="([A-Za-z0-9_.-]+)"></script>', html)
app_pos = order.index("app.js") if "app.js" in order else -1
check("app.js loads AFTER class files",
      app_pos > 0 and all(o in ("connecto_sim.js", "hero_organism.js", "connectome_graph.js")
                          for o in order[:app_pos]) and len(order) == 4,
      "order=" + ",".join(order))

# 4. every script src actually exists on disk
for o in order:
    check(f"script file exists: {o}", (WEB / o).is_file())

# 5. canvas elements present with non-zero default attributes
for cid in ["rig-canvas"]:
    m = re.search(rf'<canvas id="{cid}"[^>]*>', html)
    ok = m and re.search(r'width="\d+"', m.group(0)) and re.search(r'height="\d+"', m.group(0))
    check(f"canvas #{cid} has width/height attributes", bool(ok), m.group(0) if m else "not found")

print("FRONTEND_AUDIT_PASSED" if not FAILURES else f"{len(FAILURES)} ISSUE(S) FOUND")
sys.exit(0 if not FAILURES else 1)