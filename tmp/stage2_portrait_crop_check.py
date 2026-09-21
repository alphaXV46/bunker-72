from pathlib import Path

from PIL import Image, ImageDraw, ImageOps


ASSETS = [
    ('minimarket', 'src/assets/backgrounds/bg_prolog_minimarket.webp', 0.62),
    ('medical', 'src/assets/backgrounds/bg_prolog_medical.webp', 0.62),
    ('hendra', 'src/assets/backgrounds/bg_prolog_hendra.webp', 0.61),
    ('route_failure', 'src/assets/backgrounds/bg_prolog_route_failure.webp', 0.58),
]
VIEWPORT = (390, 844)
out_dir = Path(r'C:\Users\grady\.codex\visualizations\2026\09\20\01a0bf83-beff-7981-9850-606ab9be16b4\stage2-crops')
out_dir.mkdir(parents=True, exist_ok=True)

vw, vh = VIEWPORT
sheet = Image.new('RGB', (len(ASSETS) * 180, 420), '#090a0c')
draw = ImageDraw.Draw(sheet)

for index, (name, asset_path, position) in enumerate(ASSETS):
    source = Image.open(asset_path).convert('RGB')
    scale = max(vw / source.width, vh / source.height)
    resized = source.resize((round(source.width * scale), round(source.height * scale)), Image.Resampling.LANCZOS)
    left = round((resized.width - vw) * position)
    top = max(0, (resized.height - vh) // 2)
    crop = resized.crop((left, top, left + vw, top + vh))
    crop.save(out_dir / f'{name}_portrait_390x844_positioned.jpg', 'JPEG', quality=88)
    thumb = ImageOps.contain(crop, (165, 360))
    sheet.paste(thumb, (index * 180 + (165 - thumb.width) // 2, 35))
    draw.text((index * 180 + 4, 8), f'{name} {position}', fill='white')

sheet.save(out_dir / 'portrait_390x844_positioned_contact.jpg', 'JPEG', quality=88)
