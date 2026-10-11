"""Builds one before/after contact sheet per screen size from the raw shots.

Usage: python -I contact.py <raw_dir> <out_dir> <prefix> [before_tag] [after_tag]
Writes <out_dir>/<prefix>-<size>.png: a labelled row of the six scenarios before, and a row after.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SCENARIOS = ['title', 'fresh', 'placing', 'house', 'summary', 'welcome']
SIZES = {'phone-portrait': 0.5, 'phone-landscape': 0.45, 'tablet': 0.32, 'laptop': 0.27}


def font(size):
    for name in ('segoeui.ttf', 'arial.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def main():
    raw, out, prefix = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
    before = sys.argv[4] if len(sys.argv) > 4 else 'before'
    after = sys.argv[5] if len(sys.argv) > 5 else 'after'
    out.mkdir(parents=True, exist_ok=True)
    label_h, gap, pad = 34, 12, 16
    f_head, f_lab = font(22), font(16)
    for size, scale in SIZES.items():
        rows = []
        for tag in (before, after):
            imgs = []
            for sc in SCENARIOS:
                p = raw / f'{tag}-{sc}-{size}.png'
                if not p.exists():
                    continue
                im = Image.open(p).convert('RGB')
                im = im.resize((round(im.width * scale), round(im.height * scale)), Image.LANCZOS)
                imgs.append((sc, im))
            rows.append((tag, imgs))
        if not any(imgs for _, imgs in rows):
            continue
        w = max(sum(im.width for _, im in imgs) + gap * (len(imgs) - 1) for _, imgs in rows if imgs) + pad * 2
        h = pad + sum(label_h + label_h + (max(im.height for _, im in imgs) if imgs else 0) + gap for _, imgs in rows) + pad
        sheet = Image.new('RGB', (w, h), (243, 231, 203))
        d = ImageDraw.Draw(sheet)
        y = pad
        for tag, imgs in rows:
            d.text((pad, y), f'{tag.capitalize()} ({size.replace("-", " ")})', fill=(43, 31, 14), font=f_head)
            y += label_h
            x = pad
            for sc, im in imgs:
                d.text((x, y + 6), sc, fill=(90, 72, 50), font=f_lab)
                sheet.paste(im, (x, y + label_h))
                x += im.width + gap
            y += label_h + (max(im.height for _, im in imgs) if imgs else 0) + gap
        target = out / f'{prefix}-{size}.png'
        sheet.save(target, optimize=True)
        print('wrote', target, sheet.size)


if __name__ == '__main__':
    main()
