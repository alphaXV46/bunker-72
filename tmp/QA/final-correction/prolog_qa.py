from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
ROOT = Path(__file__).resolve().parents[3]
QA = Path(__file__).resolve().parent
GENERATED = Path(r'C:\Users\grady\.codex\generated_images\01a0bf83-beff-7981-9850-606ab9be16b4')
files = {
    'bg_prolog2': 'exec-4d459c49-0449-44fa-a363-5ce31dba352e.png',
    'bg_prolog3': 'exec-964be277-b821-46bc-a4d7-a1ce328a44e6.png',
    'bg_prolog4': 'exec-5770bb3b-1f4b-44e5-a74b-4fccc10bcf00.png',
}
board = Image.new('RGB', (1500, 900), '#20252a')
draw = ImageDraw.Draw(board)
names = ['bg_prolog2', 'bg_prolog_minimarket', 'bg_prolog_medical', 'bg_prolog_hendra', 'bg_prolog_route_failure', 'bg_prolog3', 'bg_prolog4']
for name, source in files.items():
    im = Image.open(GENERATED / source).convert('RGB')
    im.save(QA / f'{name}.review.webp', 'WEBP', quality=92, method=6)
    for w,h in ((1280,720),(960,700),(390,844),(844,390)):
        x = (.58 if name == 'bg_prolog2' else .92) if w == 390 else .5
        ImageOps.fit(im,(w,h),Image.Resampling.LANCZOS,centering=(x,.5)).save(QA/f'{name}-{w}x{h}.jpg',quality=92)
    print(name, im.size, (QA/f'{name}.review.webp').stat().st_size)
for i,name in enumerate(names):
    path = QA/f'{name}.review.webp' if name in files else ROOT/'src/assets/backgrounds'/f'{name}.webp'
    im = Image.open(path).convert('RGB')
    im.thumbnail((495,270))
    x,y=(i%3)*500,(i//3)*300
    draw.text((x+8,y+6),name,fill='white')
    board.paste(im,(x,y+26))
board.save(QA/'prolog-style-board.jpg',quality=94)
