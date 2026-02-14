#!/bin/bash
# Capture store assets using Chromium headless and convert to 24-bit PNG

# Use absolute path of the script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

# Detect Chrome Path
if [[ "$OSTYPE" == "darwin"* ]]; then
  CHROME_PATHS=(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"
    "/Applications/Chromium.app/Contents/MacOS/Chromium"
    "$HOME/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  )
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  CHROME_PATHS=(
    "google-chrome"
    "google-chrome-stable"
    "chromium-browser"
    "chromium"
  )
fi

CHROME=""
for path in "${CHROME_PATHS[@]}"; do
  if command -v "$path" &>/dev/null; then
    CHROME="$path"
    break
  elif [[ -f "$path" ]]; then
    CHROME="$path"
    break
  fi
done

if [[ -z "$CHROME" ]]; then
  echo "Error: Google Chrome or Chromium not found."
  exit 1
fi

capture() {
  local html="$1"
  local output="$2"
  local width="$3"
  local height="$4"
  
  echo "Capturing $html → $output (${width}x${height})"
  "$CHROME" --headless=new --disable-gpu --screenshot="$output.tmp.png" \
    --window-size="${width},${height}" --hide-scrollbars --force-device-scale-factor=1 \
    "file://$SCRIPT_DIR/$html" 2>/dev/null
  
  # Wait for file to exist and be non-empty (max 5 seconds)
  local retry=0
  while [[ ! -s "$output.tmp.png" ]] && [[ $retry -lt 50 ]]; do
    sleep 0.1
    ((retry++))
  done

  if [[ ! -s "$output.tmp.png" ]]; then
    echo "Error: Failed to capture screenshot for $html"
    return 1
  fi
  
  # Convert to 24-bit PNG (remove alpha channel)
  if command -v magick &>/dev/null; then
    magick "$output.tmp.png" -background white -alpha remove -alpha off PNG24:"$output"
  elif command -v convert &>/dev/null; then
    convert "$output.tmp.png" -background white -alpha remove -alpha off PNG24:"$output"
  elif command -v python3 &>/dev/null; then
    python3 -c "from PIL import Image; Image.open('$output.tmp.png').convert('RGB').save('$output')" 2>/dev/null
  elif command -v sips &>/dev/null; then
    sips -s format png --setProperty formatOptions 0 "$output.tmp.png" --out "$output" &>/dev/null
  else
    cp "$output.tmp.png" "$output"
  fi
  rm -f "$output.tmp.png"
}

# Screenshots 1280x800
capture "screenshot-zh-1.html" "screenshot-zh-proofread.png" 1280 800
capture "screenshot-zh-2-settings.html" "screenshot-zh-settings.png" 1280 800
capture "screenshot-zh-3-translate.html" "screenshot-zh-translate.png" 1280 800
capture "screenshot-en-1.html" "screenshot-en-summarize.png" 1280 800
capture "screenshot-en-2.html" "screenshot-en-translate.png" 1280 800

# Small promo 440x280
capture "promo-small.html" "promo-small-440x280.png" 440 280

# Banner 1400x560
capture "promo-banner.html" "promo-banner-1400x560.png" 1400 560

echo "Done! Generated files in $SCRIPT_DIR:"
ls -lh "$SCRIPT_DIR"/*.png 2>/dev/null
