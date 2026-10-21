#!/usr/bin/env python3
"""Rebuild edit.html from index.html. The two pages are identical apart from the title,
the eyebrow line and the config script that switches editor mode on."""
import pathlib, sys

root = pathlib.Path(__file__).resolve().parent.parent
src = (root / "index.html").read_text(encoding="utf-8")
swaps = [
    ("<title>Adam's Priority Board</title>", "<title>Adam's Priority Board (editor)</title>"),
    ('<div class="eyebrow">Creative &amp; content work · live queue</div>',
     '<div class="eyebrow">Editor view · changes save to the live board</div>'),
    ("<script>window.PB_CONFIG=", "<script>window.PB_EDITOR=true;window.PB_CONFIG="),
]
out = src
for old, new in swaps:
    if out.count(old) != 1:
        sys.exit(f"sync_edit: expected exactly one occurrence of {old!r} in index.html")
    out = out.replace(old, new)
(root / "edit.html").write_text(out, encoding="utf-8")
print("edit.html rebuilt from index.html")
