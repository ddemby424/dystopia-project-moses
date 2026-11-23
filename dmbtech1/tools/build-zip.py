#!/usr/bin/env python3
"""Build dmbtech1-v1.0.0.zip next to the library (no node build step)."""
import os, zipfile
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'dmbtech1-v1.0.0.zip')
INCLUDE = [
    'dmbtech1.js', 'README.md', 'LICENSE', 'CHANGELOG.md',
    'examples/minimal/index.html', 'examples/minimal/tiny-arena.retro',
    'examples/custom-weapon/index.html', 'examples/custom-weapon/tiny-arena.retro',
    'examples/level-script/index.html', 'examples/level-script/script-yard.retro',
    'maps/tiny-arena.retro', 'maps/script-yard.retro',
]
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for rel in INCLUDE:
        path = os.path.join(ROOT, rel)
        if not os.path.isfile(path):
            raise SystemExit('missing ' + rel)
        z.write(path, arcname=os.path.join('dmbtech1-v1.0.0', rel))
print('wrote', OUT, os.path.getsize(OUT), 'bytes')
