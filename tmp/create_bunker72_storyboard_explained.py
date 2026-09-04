from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(r"C:\laragon\www\bunker 72")
SOURCE = Path(r"C:\Users\grady\.codex\generated_images\01a06118-1fd4-73f2-9607-dde609edb773\exec-27847410-5f62-4139-8068-2261639ee1fc.png")
OUT_DIR = ROOT / "output" / "imagegen"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT = OUT_DIR / "bunker72_storyboard_blonde_explained.png"

W, H = 3000, 3000
PAPER = (236, 231, 220)
INK = (38, 44, 48)
MUTED = (99, 101, 99)
ACCENT = (181, 72, 39)
CARD = (250, 247, 239)
LINE = (142, 133, 118)
FONT_DIR = Path(r"C:\Windows\Fonts")

def f(name, size):
    return ImageFont.truetype(str(FONT_DIR / name), size)

TITLE = f("segoeuib.ttf", 72)
SUB = f("segoeui.ttf", 34)
SECTION = f("segoeuib.ttf", 27)
BODY = f("segoeui.ttf", 27)
BODY_BOLD = f("segoeuib.ttf", 27)
SMALL = f("segoeui.ttf", 23)
BADGE = f("segoeuib.ttf", 35)

def wrap(draw, text, font, width):
    words = text.split()
    lines, current = [], ""
    for word in words:
        test = word if not current else current + " " + word
        if draw.textbbox((0, 0), test, font=font)[2] <= width:
            current = test
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines

def fit(img, size):
    tw, th = size
    ratio = max(tw / img.width, th / img.height)
    nw, nh = round(img.width * ratio), round(img.height * ratio)
    resized = img.resize((nw, nh), Image.Resampling.LANCZOS)
    left, top = (nw - tw) // 2, (nh - th) // 2
    return resized.crop((left, top, left + tw, top + th))

def section(draw, x, y, label, text, width):
    draw.text((x, y), label, font=SECTION, fill=ACCENT)
    y += 36
    for line in wrap(draw, text, BODY, width)[:3]:
        draw.text((x, y), line, font=BODY, fill=INK)
        y += 34
    return y + 16

src = Image.open(SOURCE).convert("RGB")
sw, sh = src.size
panels = []
for row in range(3):
    for col in range(2):
        x1, x2 = col * sw // 2 + 4, (col + 1) * sw // 2 - 4
        y1, y2 = row * sh // 3 + 4, (row + 1) * sh // 3 - 4
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
draw.text((100, 62), "STORYBOARD GAME", font=TITLE, fill=INK)
draw.line((100, 151, 720, 151), fill=ACCENT, width=6)
draw.text((100, 178), "Judul Game : BUNKER 72 — 72 JAM PERTAMA", font=SUB, fill=INK)
draw.text((W - 590, 190), "Gambar + keterangan adegan", font=SMALL, fill=MUTED)

card_w, card_h = 1390, 770
positions = [(80, 330), (1530, 330), (80, 1180), (1530, 1180), (80, 2030), (1530, 2030)]
angles = [-0.6, 0.7, -0.5, 0.6, -0.6, 0.5]

for idx, ((scene, visual, desc, action, location), panel, (x, y), angle) in enumerate(zip(rows, panels, positions, angles)):
    card = Image.new("RGBA", (card_w + 50, card_h + 50), (0, 0, 0, 0))
    shadow = Image.new("RGBA", card.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle((28, 35, card_w + 32, card_h + 42), radius=28, fill=(30, 35, 36, 48))
    card.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(12)))
    cd = ImageDraw.Draw(card)
    cd.rounded_rectangle((18, 18, card_w + 22, card_h + 28), radius=28, fill=CARD, outline=LINE, width=3)

    art = fit(panel, (560, 650))
    mask = Image.new("L", art.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, art.width - 1, art.height - 1), radius=22, fill=255)
    card.paste(art, (50, 60), mask)
    cd.rounded_rectangle((50, 60, 610, 710), radius=22, outline=(218, 207, 190), width=2)

    cd.ellipse((34, 18, 115, 99), fill=ACCENT, outline=CARD, width=5)
    cd.text((62, 35), scene, font=BADGE, fill=(255, 249, 236))
    cd.text((130, 40), "SCENE", font=SECTION, fill=MUTED)
    cd.line((665, 70, card_w - 30, 70), fill=(218, 207, 190), width=2)
    cd.text((665, 92), "SKETSA / VISUAL", font=SECTION, fill=ACCENT)
    yy = 130
    for line in wrap(cd, visual, BODY, card_w - 735)[:3]:
        cd.text((665, yy), line, font=BODY, fill=MUTED)
        yy += 34
    yy += 14
    yy = section(cd, 665, yy, "KETERANGAN / ADEGAN", desc, card_w - 735)
    yy = section(cd, 665, yy, "AKSI KARAKTER", action, card_w - 735)
    cd.text((665, yy), "LOKASI", font=SECTION, fill=ACCENT)
    for n, line in enumerate(wrap(cd, location, BODY_BOLD, card_w - 770)[:2]):
        cd.text((795, yy + n * 34), line, font=BODY_BOLD, fill=INK)
    rotated = card.rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)
    board.paste(rotated, (x - 25, y - 25), rotated)

draw.line((100, 2885, W - 100, 2885), fill=ACCENT, width=3)
draw.text((100, 2920), "Alur emosi: urgensi → perlindungan → persiapan → risiko → harapan → penyelamatan", font=SMALL, fill=MUTED)
board.save(OUT, quality=96)
print(OUT)
