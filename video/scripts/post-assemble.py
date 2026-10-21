"""Run after assemble-index.mjs (it regenerates index.html):
- base ground is Holoscope black, not the preset's light canvas;
- hoisted footage <video>s sit UNDER the frame layers (the assembler appends them after the scenes, i.e. on top).
"""
from pathlib import Path

p = Path(__file__).resolve().parent.parent / "index.html"
s = p.read_text(encoding="utf-8")
s = s.replace("        background: #eef2f8;\n      }\n      .scene {", "        background: #000;\n      }\n      .scene {", 1)
marker = "/* holoscope: layer order */"
if marker not in s:
    s = s.replace("    </style>", f"      {marker}\n      #root > video {{ z-index: 1; }}\n      .scene {{ z-index: 2; }}\n    </style>", 1)
p.write_text(s, encoding="utf-8")
print("post-assemble: black ground + footage under frames")
