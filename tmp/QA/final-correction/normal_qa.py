from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
QA = Path(__file__).resolve().parent
SOURCE = Path(r'C:\Users\grady\.codex\generated_images\01a0bf83-beff-7981-9850-606ab9be16b4\exec-bf26aa4f-db28-492a-a6e3-b563fe217f9e.png')
im = Image.open(SOURCE).convert('RGB')
im.save(QA / 'normal.review.webp', 'WEBP', quality=92, method=6)
refs = [ROOT / f'src/assets/avatars/{who}/{who}_serius.png' for who in ('ayah', 'ibu', 'anak')]
board = Image.new('RGB', (1400, 820), '#20252a')
draw = ImageDraw.Draw(board)
for i, path in enumerate(refs):
    avatar = Image.open(path).convert('RGBA')
    avatar.thumbnail((250, 250))
    board.paste(avatar, (i * 260, 28), avatar)
    draw.text((i * 260 + 10, 8), path.stem, fill='white')
family = im.crop((int(im.width*.49), int(im.height*.13), int(im.width*.78), int(im.height*.91)))
family.thumbnail((560, 760))
board.paste(family, (810, 35))
for i, filename in enumerate(('bg_good_end_1.webp', 'bg_bad_end_2.webp')):
    ref = Image.open(ROOT / 'src/assets/backgrounds' / filename).convert('RGB')
    ref.thumbnail((390, 280))
    board.paste(ref, (i*400, 350))
    draw.text((i*400+10, 328), filename, fill='white')
board.save(QA / 'normal-identity-board.jpg', quality=94)
for w,h in ((1280,720),(960,700),(390,844),(844,390)):
    position = .65 if w == 390 else .58
    crop = ImageOps.fit(im, (w,h), Image.Resampling.LANCZOS, centering=(position,.5))
    crop.save(QA / f'normal-crop-{w}x{h}.jpg', quality=94)
print('QA only:', im.size, 'WebP bytes:', (QA / 'normal.review.webp').stat().st_size)
