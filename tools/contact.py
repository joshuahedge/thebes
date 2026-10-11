"""Builds one before/after contact sheet per screen size from the raw shots.

Usage: python -I contact.py <raw_dir> <out_dir> <prefix> [before_tag] [after_tag] [--stage2]
Writes <out_dir>/<prefix>-<size>.png: a labelled row of the six scenarios before, and a row after. With --stage2
the after row holds the Stage 2 scenes (shots.ps1 -Stage2); the before row keeps the early-game six.
"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SCENARIOS = ['title', 'fresh', 'placing', 'house', 'summary', 'welcome']
STAGE2_SCENARIOS = ['title', 'city', 'placing', 'manor', 'trade', 'summary']
SIZES = {'phone-portrait': 0.5, 'phone-landscape': 0.45, 'tablet': 0.32, 'laptop': 0.27}


def font(size):
    for name in ('segoeui.ttf', 'arial.ttf', 'DejaVuSans.ttf'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def main():
    args = [a for a in sys.argv[1:] if a != '--stage2']
    stage2 = '--stage2' in sys.argv[1:]
    raw, out, prefix = Path(args[0]), Path(args[1]), args[2]
    before = args[3] if len(args) > 3 else 'before'
    after = args[4] if len(args) > 4 else 'after'
    out.mkdir(parents=True, exist_ok=True)
    label_h, gap, pad = 34, 12, 16
    f_head, f_lab = font(22), font(16)
    for size, scale in SIZES.items():
        rows = []
        for tag, scenarios in ((before, SCENARIOS), (after, STAGE2_SCENARIOS if stage2 else SCENARIOS)):
            imgs = []
            for sc in scenarios:
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
            pic_h = max(im.height for _, im in imgs) if imgs else 0
            x = pad
            for sc, im in imgs:
                # Default: the name above its picture. --stage2: under it (the two rows' scene names differ).
                d.text((x, y + pic_h + 6 if stage2 else y + 6), sc, fill=(90, 72, 50), font=f_lab)
                sheet.paste(im, (x, y if stage2 else y + label_h))
                x += im.width + gap
            y += label_h + pic_h + gap
        target = out / f'{prefix}-{size}.png'
        sheet.save(target, optimize=True)
        print('wrote', target, sheet.size)


if __name__ == '__main__':
    main()
