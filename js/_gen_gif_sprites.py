from pathlib import Path
from PIL import Image, ImageSequence
import json

root = Path(__file__).resolve().parents[1]
videos = root / "buckets" / "digitus-forum-media" / "videos"
out_dir = root / "buckets" / "digitus-forum-media" / "frames"
out_dir.mkdir(parents=True, exist_ok=True)
js_path = root / "js" / "gif-sprites.js"

meta = {}
for gif in sorted(videos.glob("*.gif")):
    im = Image.open(gif)
    frames = []
    delays = []
    for frame in ImageSequence.Iterator(im):
        frames.append(frame.convert("RGBA"))
        delays.append(int(frame.info.get("duration") or 100))
    w, h = frames[0].size
    if w > 480 or h > 480:
        scale = min(480 / w, 480 / h)
        w = max(1, int(w * scale))
        h = max(1, int(h * scale))
        frames = [f.resize((w, h), Image.BILINEAR) for f in frames]
    sheet = Image.new("RGBA", (w * len(frames), h))
    for i, fr in enumerate(frames):
        sheet.paste(fr, (i * w, 0))
    png_name = gif.stem + ".png"
    sheet.save(out_dir / png_name, optimize=True)
    meta[gif.name] = {
        "sheet": "buckets/digitus-forum-media/frames/" + png_name,
        "w": w,
        "h": h,
        "n": len(frames),
        "delays": delays,
    }
    print(gif.name, len(frames), w, h)

js_path.write_text(
    "window.GIF_SPRITES = " + json.dumps(meta, indent=2) + ";\n",
    encoding="utf-8",
)
print("wrote", js_path)
