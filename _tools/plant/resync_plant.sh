#!/usr/bin/env bash
# Re-sync debjyoti.org/plant/ from the PLANT paper repo.
#   bash resync_plant.sh page      the project page (keeps the deployment edits)
#   bash resync_plant.sh poster    poster PDF + preview images (the poster is still changing)
#   bash resync_plant.sh slides    slides PDF + the video's poster frame (title slide)
#   bash resync_plant.sh video     re-encode the talk for the web (about 1 minute)
#   bash resync_plant.sh captions  regenerate the captions (needs make_vtt.py, see below)
# SRC must point at the PLANT paper repo (the folder holding website/, neurips-talk/, neurips-poster/).
# DST defaults to this repo's plant/ folder; IMG (the main site's resized copies) to assets/img/. Point both
# elsewhere for a dry run. Nothing is written to the paper repo.
# Example: SRC=/path/to/the/paper/repository bash _tools/plant/resync_plant.sh poster
set -euo pipefail
SRC=${SRC:?set SRC to the PLANT paper repo (the folder with website/, neurips-talk/, neurips-poster/)}
DST=${DST:-$(cd "$(dirname "$0")/../../plant" && pwd)}
IMG=${IMG:-$(cd "$(dirname "$0")/../../assets/img" && pwd)}   # resized copies used by index.html
BASE=${BASE:-94cf310}      # paper-repo commit the deployed page was made from (website/ at deployment)
MAKE_VTT=${MAKE_VTT:-$(dirname "$0")/make_vtt.py}
SITE_REPO=$(cd "$(dirname "$0")/../.." && pwd)
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT

mark() {  # record a copy into this repo (not a dry run elsewhere) for _tools/site_sync.py
  if [ "$DST" = "$SITE_REPO/plant" ]; then python3 "$SITE_REPO/_tools/site_sync.py" mark plant --src "$SRC" "$@"; fi
}

page() {
  # 1. the deployment edits, as a patch: the page at BASE against the deployed page
  git -C "$SRC" show "$BASE:website/index.html" > "$TMP/base.html"
  diff -u "$TMP/base.html" "$DST/index.html" > "$TMP/deploy.patch" || true
  # 2. the CSS additions are one block at the end of site.css
  sed -n '/==== debjyoti.org deployment additions ====/,$p' "$DST/assets/css/site.css" > "$TMP/deploy.css"
  test -s "$TMP/deploy.css" || { echo "deployment CSS block not found" >&2; exit 1; }
  # 3. everything else as it is upstream (media/ is excluded, so --delete leaves it alone)
  rsync -a --delete --exclude='_notes/' --exclude='README.md' --exclude='.DS_Store' --exclude='media/' \
    --exclude='/index.html' --exclude='/assets/css/site.css' "$SRC/website/" "$DST/"
  # 4. upstream index.html with the edits re-applied; upstream site.css with the block appended
  cp "$SRC/website/index.html" "$TMP/new.html"
  patch --quiet --no-backup-if-mismatch "$TMP/new.html" < "$TMP/deploy.patch" \
    || { echo "patch did not apply cleanly: merge $TMP/deploy.patch by hand (kept: $DST/index.html)" >&2; trap - EXIT; exit 1; }
  cp "$TMP/new.html" "$DST/index.html"
  { cat "$SRC/website/assets/css/site.css"; printf '\n'; cat "$TMP/deploy.css"; } > "$DST/assets/css/site.css"
  echo "page synced; if upstream changed, set BASE to the new commit after checking the page: git -C $SRC log -1 --format=%h -- website/"
  mark page
}

poster() {
  cp "$SRC/neurips-poster/out/poster.pdf" "$DST/media/plant-neurips2026-poster.pdf"
  ffmpeg -v error -y -i "$SRC/neurips-poster/out/poster_upload.png" \
    -vf "scale=1600:-1:flags=lanczos+accurate_rnd+full_chroma_int,setsar=1" -map_metadata -1 "$TMP/poster_1600.png"
  cwebp -quiet -q 85 -m 6 -sharp_yuv -metadata none "$TMP/poster_1600.png" -o "$DST/media/plant-neurips2026-poster.webp"
  ffmpeg -v error -y -i "$TMP/poster_1600.png" -map_metadata -1 -flags +bitexact -pix_fmt yuvj420p -q:v 3 \
    "$DST/media/plant-neurips2026-poster.jpg"
  for w in 480 800; do   # the Talks thumbnail (srcset 480w, 800w)
    cwebp -quiet -q 82 -m 6 -resize "$w" 0 -metadata none "$TMP/poster_1600.png" -o "$IMG/plant-poster-$w.webp"
  done
  ffprobe -v error -show_entries stream=width,height -of csv=p=0 "$DST/media/plant-neurips2026-poster.jpg" \
    | awk -F, '{print "poster preview " $1 "x" $2 " (index.html says width=\"1600\" height=\"1029\"; update it if this differs)"}'
  mark poster
}

slides() {
  cp "$SRC/neurips-talk/out/slides.pdf" "$DST/media/plant-neurips2026-slides.pdf"
  ffmpeg -v error -y -i "$SRC/neurips-talk/out/preview/slide-01.png" -vf setsar=1 -map_metadata -1 -flags +bitexact \
    -pix_fmt yuvj420p -q:v 3 "$DST/media/plant-neurips2026-talk-poster.jpg"
  # the video's poster frame on the main site (site.js attaches it; the no-JS CSS poster uses it too)
  cwebp -quiet -q 82 -m 6 -resize 1280 0 -metadata none "$SRC/neurips-talk/out/preview/slide-01.png" -o "$IMG/plant-talk-poster-1280.webp"
  mark slides
}

video() {
  ffmpeg -v warning -y -i "$SRC/neurips-talk/out/video/PLANT_NeurIPS2026_talk.mp4" \
    -map 0:v:0 -map 0:a:0 -map_metadata -1 -map_chapters -1 \
    -c:v libx264 -profile:v high -level:v 4.1 -refs 4 -preset veryslow -tune stillimage -crf 16 -pix_fmt yuv420p -g 300 \
    -x264-params "colorprim=bt709:transfer=bt709:colormatrix=bt709" -color_range tv \
    -af "pan=mono|c0=0.5*c0+0.5*c1" -c:a aac -b:a 96k -ar 48000 \
    -movflags +faststart "$DST/media/plant-neurips2026-talk.mp4"
  echo "video re-encoded; regenerate the captions too if the talk changed (bash $0 captions)"
}

captions() {
  test -f "$MAKE_VTT" || { echo "make_vtt.py not found at $MAKE_VTT (set MAKE_VTT=...)" >&2; exit 1; }
  python3 "$MAKE_VTT" "$SRC/neurips-talk" "$DST/media/plant-neurips2026-talk.mp4" "$DST/media/plant-neurips2026-talk.en.vtt" --report
  mark talk   # the video and its captions are one part
}

for step in "${@:-}"; do
  case "$step" in
    page|poster|slides|video|captions) "$step" ;;
    *) echo "usage: bash $0 page|poster|slides|video|captions ..." >&2; exit 2 ;;
  esac
done
