# Fonts

All fonts here are self-hosted WOFF2 files under the SIL Open Font License 1.1 (full text in `OFL.txt`).
They are subsets or instances made for this site, so they are small. `assets/css/site.css` (section 01) declares them.

| File | Family in CSS | Source and copyright |
|---|---|---|
| `fraunces-latin-normal.woff2` | `Fraunces` | Fraunces (upright only; no element uses its italic). Copyright 2020 The Fraunces Project Authors (github.com/undercasetype/Fraunces). Latin subset, variable: `opsz` 9–144 and `wght` 300–700 kept; `SOFT` pinned to 50 and `WONK` to 0. |
| `inter-latin-normal.woff2` | `Inter` | Inter. Copyright 2016 The Inter Project Authors (github.com/rsms/inter). Latin subset, variable `wght` 400–700. |
| `jetbrains-mono-latin-normal.woff2` | `JetBrains Mono` | JetBrains Mono. Copyright 2020 The JetBrains Mono Project Authors (github.com/JetBrains/JetBrainsMono). Latin subset, variable `wght` 400–700. |
| `tiro-bangla-name.woff2` | `Tiro Bangla` | Tiro Bangla. Copyright 2020 The Indigo Project Authors (github.com/TiroTypeworks/Indigo). Subset to the glyphs of the name দেবজ্যোতি সাহা রায়, with the shaping tables kept. Other Bengali text falls back to system fonts. |
| `figmath-regular.woff2`, `figmath-italic.woff2` | `FigMath` | The maths glyphs used in the PLANT figure, taken from the KaTeX fonts (Main, Math, Caligraphic, AMS, Size1). Copyright (c) 2009–2010 Design Science, Inc.; Copyright (c) 2014–2018 Khan Academy. Renamed, as the license asks of modified versions. |

## If the Bengali name changes

`tiro-bangla-name.woff2` only contains the letters of the current name. To typeset different Bengali text in Tiro Bangla,
download `TiroBangla-Regular.ttf` (Google Fonts) and subset it again, for example with fontTools:

    pyftsubset TiroBangla-Regular.ttf --text="NEW TEXT" --layout-features='*' --no-hinting \
      --flavor=woff2 --output-file=tiro-bangla-name.woff2

Without that step the page still works: the browser uses the system Bengali font listed in `--font-bn`.
