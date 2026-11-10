"""Share-card (next/og) fonts.

next/og (satori) cannot read WOFF2 or variable fonts, so we derive static TTF
instances from the site's own @fontsource-variable packages (latin + latin-ext
subsets: Turkish needs latin-ext). Output: lib/news/og-fonts/*.ttf

    pip install fonttools brotli && python3 scripts/og-fonts.py
"""
import os
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NM = os.path.join(ROOT, "node_modules", "@fontsource-variable")
OUT = os.path.join(ROOT, "lib", "news", "og-fonts")
os.makedirs(OUT, exist_ok=True)

JOBS = [
    # (source pattern, output name, axis location)
    ("bricolage-grotesque/files/bricolage-grotesque-{s}-opsz-normal.woff2", "brico-800-{s}.ttf", {"wght": 800, "opsz": 96}),
    ("bricolage-grotesque/files/bricolage-grotesque-{s}-opsz-normal.woff2", "brico-700-{s}.ttf", {"wght": 700, "opsz": 36}),
    ("figtree/files/figtree-{s}-wght-normal.woff2", "figtree-500-{s}.ttf", {"wght": 500}),
    ("figtree/files/figtree-{s}-wght-normal.woff2", "figtree-700-{s}.ttf", {"wght": 700}),
]

for subset in ("latin", "latin-ext"):
    for src, out, loc in JOBS:
        f = TTFont(os.path.join(NM, src.format(s=subset)))
        inst = instantiateVariableFont(f, loc)
        inst.flavor = None
        p = os.path.join(OUT, out.format(s=subset))
        inst.save(p)
        print(p, os.path.getsize(p))

# Symbols the site fonts don't have (arrows, ≈, ×, ✓) from DejaVu Sans Bold (Bitstream Vera licence: free to
# redistribute). Satori falls back to it per glyph, so "75 → 25 s" renders without a network font fetch.
DEJAVU = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
if os.path.exists(DEJAVU):
    from fontTools import subset
    opts = subset.Options()
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    f = TTFont(DEJAVU)
    s = subset.Subsetter(opts)
    s.populate(text="→←↑↓↗≈≠≤≥×✓✗•")
    s.subset(f)
    p = os.path.join(OUT, "symbols.ttf")
    f.save(p)
    print(p, os.path.getsize(p))
