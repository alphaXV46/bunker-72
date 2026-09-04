from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(r"C:\laragon\www\bunker 72")
SOURCE = Path(r"C:\Users\grady\.codex\generated_images\01a06118-1fd4-73f2-9607-dde609edb773\exec-27847410-5f62-4139-8068-2261639ee1fc.png")
OUT_DIR = ROOT / "output" / "imagegen"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT = OUT_DIR / "bunker72_storyboard_blonde_organic.png"

W, H = 2800, 3500
PAPER = (236, 231, 220)
INK = (38, 44, 48)
MUTED = (99, 101, 99)
ACCENT = (181, 72, 39)
CARD = (250, 247, 239)
LINE = (142, 133, 118)

FONT_DIR = Path(r"C:\Windows\Fonts")
def font(name, size):
    return ImageFont.truetype(str(FONT_DIR / name), size)

TITLE = font("segoeuib.ttf", 70)
SUBTITLE = font("segoeui.ttf", 34)
CARD_HEAD = font("segoeuib.ttf", 24)
BODY = font("segoeui.ttf", 25)
BODY_BOLD = font("segoeuib.ttf", 25)
BADGE = font("segoeuib.ttf", 34)
SMALL = font("segoeui.ttf", 22)

def wrap(draw, text, fnt, max_width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        candidate = word if not current else current + " " + word
        if draw.textbbox((0, 0), candidate, font=fnt)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines

def draw_section(draw, x, y, label, text, width):
    draw.text((x, y), label, font=CARD_HEAD, fill=ACCENT)
    y += 30
    lines = wrap(draw, text, BODY, width)
    for line in lines[:3]:
        draw.text((x, y), line, font=BODY, fill=INK)
        y += 31
    return y + 7

def fitted(img, size):
    tw, th = size
    ratio = max(tw / img.width, th / img.height)
    nw, nh = round(img.width * ratio), round(img.height * ratio)
    img = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left, top = (nw - tw) // 2, (nh - th) // 2
    return img.crop((left, top, left + tw, top + th))

src = Image.open(SOURCE).convert("RGB")
sw, sh = src.size
panels = []
for row in range(3):
    for col in range(2):
        x1 = col * sw // 2 + 4
        x2 = (col + 1) * sw // 2 - 4
        y1 = row * sh // 3 + 4
        y2 = (row + 1) * sh // 3 - 4
        panels.append(src.crop((x1, y1, x2, y2)))

rows = [
    ("1", "Aris menggiring Sarah dan Maya menuju pintu baja Bunker 72 saat hujan abu mulai turun.", "Peringatan Krakatau berubah menjadi keadaan darurat. Rumah harus ditinggalkan sebelum jalur evakuasi tertutup.", "Aris membuka palka dan menjaga Sarah serta Maya tetap bersama.", "Rumah / pintu masuk bunker"),
    ("2", "Keluarga menuruni tangga logam yang sempit di bawah lampu darurat merah.", "Pintu bunker ditutup. Di bawah tanah, mereka masih melewati beberapa detik paling genting sebelum aman.", "Aris menuntun Maya; Sarah memastikan ransel dan perlengkapan tidak tertinggal.", "Tangga akses Bunker 72"),
    ("3", "Aris menyalakan konsol generator dan memeriksa sistem filter udara yang berdebu.", "Bunker gelap dan pengap. Daya utama harus dipulihkan agar blower, lampu, dan radio bisa digunakan.", "Aris menarik tuas daya lalu menstabilkan sistem ventilasi.", "Ruang generator"),
    ("4", "Aftershock mengguncang bunker; keluarga menghadapi koridor servis yang tergenang dan tertutup reruntuhan.", "Jam ke-30. Persediaan menipis sehingga Aris harus keluar sebentar, meski abu dan air membuat perjalanan berbahaya.", "Aris memilih rute aman, membawa perlengkapan secukupnya, lalu mencari sumber daya.", "Koridor servis / rute ekspedisi"),
    ("5", "Di ruang radio, Aris menerima sinyal lemah sementara Sarah dan Maya menunggu dengan cemas.", "Hari ke-3. Daya cadangan tinggal sedikit. Satu transmisi jelas dapat menentukan apakah SAR menemukan bunker.", "Aris menyetel radio VHF dan mengirim koordinat Bunker 72.", "Ruang radio bunker"),
    ("6", "Palka terbuka menuju cahaya pagi; keluarga keluar bersama setelah jendela penyelamatan tercapai.", "Jam ke-72. Tim SAR mengonfirmasi posisi. Keputusan tentang air, daya, ekspedisi, dan keluarga membentuk hasil akhir.", "Aris menggandeng Maya dan Sarah menuju petugas penyelamat.", "Pintu keluar / titik evakuasi"),
]

board = Image.new("RGB", (W, H), PAPER)
draw = ImageDraw.Draw(board)
draw.text((100, 70), "STORYBOARD GAME", font=TITLE, fill=INK)
draw.line((100, 156, 690, 156), fill=ACCENT, width=6)
draw.text((100, 180), "Judul Game : BUNKER 72 — 72 JAM PERTAMA", font=SUBTITLE, fill=INK)
draw.text((W - 620, 192), "Konsep visual naratif", font=SMALL, fill=MUTED)

card_w, card_h = 1260, 855
positions = [(95, 350), (1445, 350), (95, 1300), (1445, 1300), (95, 2250), (1445, 2250)]
angles = [-1.2, 1.0, -0.8, 1.1, -1.0, 0.7]

for idx, ((scene, visual, desc, action, location), panel, (x, y), angle) in enumerate(zip(rows, panels, positions, angles)):
    card = Image.new("RGBA", (card_w + 70, card_h + 70), (0, 0, 0, 0))
    shadow = Image.new("RGBA", card.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((36, 40, card_w + 46, card_h + 55), radius=32, fill=(30, 35, 36, 45))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    card.alpha_composite(shadow)
    cd = ImageDraw.Draw(card)
    cd.rounded_rectangle((25, 25, card_w + 35, card_h + 40), radius=30, fill=CARD, outline=LINE, width=3)
    # Image window with rounded corners
    art = fitted(panel, (card_w - 70, 360))
    mask = Image.new("L", art.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, art.width - 1, art.height - 1), radius=22, fill=255)
    card.paste(art, (60, 55), mask)
    cd.rounded_rectangle((60, 55, 60 + art.width, 55 + art.height), radius=22, outline=(218, 207, 190), width=2)
    # Scene badge
    cd.ellipse((42, 22, 118, 98), fill=ACCENT, outline=CARD, width=5)
    cd.text((68, 39), scene, font=BADGE, fill=(255, 249, 236))
    cd.text((130, 42), "SCENE", font=CARD_HEAD, fill=MUTED)
    cd.text((60, 430), "SKETSA / VISUAL", font=CARD_HEAD, fill=ACCENT)
    visual_lines = wrap(cd, visual, SMALL, card_w - 120)
    yy = 462
    for line in visual_lines[:2]:
        cd.text((60, yy), line, font=SMALL, fill=MUTED)
        yy += 27
    yy += 10
    yy = draw_section(cd, 60, yy, "KETERANGAN / ADEGAN", desc, card_w - 120)
    yy = draw_section(cd, 60, yy, "AKSI KARAKTER", action, card_w - 120)
    cd.text((60, yy), "LOKASI", font=CARD_HEAD, fill=ACCENT)
    cd.text((195, yy), location, font=BODY_BOLD, fill=INK)
    rotated = card.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    board.paste(rotated, (x - 35, y - 35), rotated)

draw.line((100, 3200, W - 100, 3200), fill=ACCENT, width=3)
draw.text((100, 3235), "Alur emosi: urgensi → perlindungan → persiapan → risiko → harapan → penyelamatan", font=SMALL, fill=MUTED)
board.save(OUT, quality=96)
print(OUT)
