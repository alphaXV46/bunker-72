from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(r"C:\laragon\www\bunker 72")
SOURCE = Path(r"C:\Users\grady\.codex\generated_images\01a06118-1fd4-73f2-9607-dde609edb773\exec-b69a3199-b053-4c91-870c-d1c14bb894f2.png")
OUT_DIR = ROOT / "output" / "imagegen"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT = OUT_DIR / "bunker72_storyboard_text.png"

W, H = 2600, 3270
BG = (243, 240, 232)
INK = (38, 43, 47)
MUTED = (93, 99, 101)
ACCENT = (184, 72, 39)
HEADER = (45, 55, 61)
CELL = (251, 249, 244)
GRID = (114, 111, 103)

def font(name, size):
    path = Path(r"C:\Windows\Fonts") / name
    return ImageFont.truetype(str(path), size)

TITLE = font("segoeuib.ttf", 66)
SUBTITLE = font("segoeui.ttf", 34)
HEAD = font("segoeuib.ttf", 28)
BODY = font("segoeui.ttf", 27)
BODY_BOLD = font("segoeuib.ttf", 27)
SCENE = font("segoeuib.ttf", 40)
SMALL = font("segoeui.ttf", 23)

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

def draw_wrapped(draw, xy, text, fnt, fill, max_width, line_gap=9, align="left"):
    x, y = xy
    lines = []
    for para in text.split("\n"):
        lines.extend(wrap(draw, para, fnt, max_width) if para else [""])
    line_h = fnt.size + line_gap
    for line in lines:
        if line:
            box = draw.textbbox((0, 0), line, font=fnt)
            tw = box[2] - box[0]
            tx = x if align == "left" else x + (max_width - tw) / 2
            draw.text((tx, y), line, font=fnt, fill=fill)
        y += line_h
    return y

def fit_image(img, size):
    target_w, target_h = size
    source_ratio = img.width / img.height
    target_ratio = target_w / target_h
    if source_ratio > target_ratio:
        new_h = target_h
        new_w = round(new_h * source_ratio)
    else:
        new_w = target_w
        new_h = round(new_w / source_ratio)
    resized = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    left = max(0, (new_w - target_w) // 2)
    top = max(0, (new_h - target_h) // 2)
    return resized.crop((left, top, left + target_w, top + target_h))

src = Image.open(SOURCE).convert("RGB")
panel_boxes = [
    (8, 8, 508, 506), (516, 8, 1016, 506),
    (8, 514, 508, 1015), (516, 514, 1015, 1015),
    (8, 1023, 508, 1528), (516, 1023, 1016, 1528),
]
panels = [src.crop(box) for box in panel_boxes]

rows = [
    {"scene": "1", "visual": "Aris menggiring Sarah dan Maya menuju pintu baja Bunker 72 saat hujan abu mulai turun.", "desc": "Peringatan Krakatau berubah menjadi keadaan darurat. Rumah harus ditinggalkan sebelum jalur evakuasi tertutup.", "action": "Aris membuka palka dan menjaga Sarah serta Maya tetap bersama.", "location": "Rumah / pintu masuk bunker"},
    {"scene": "2", "visual": "Keluarga menuruni tangga logam yang sempit di bawah lampu darurat merah.", "desc": "Pintu bunker ditutup. Di bawah tanah, mereka masih harus melewati beberapa detik paling genting sebelum aman.", "action": "Aris menuntun Maya; Sarah memastikan ransel dan perlengkapan tidak tertinggal.", "location": "Tangga akses Bunker 72"},
    {"scene": "3", "visual": "Aris menyalakan konsol generator dan memeriksa sistem filter udara yang berdebu.", "desc": "Bunker gelap dan pengap. Daya utama harus dipulihkan agar blower, lampu, dan radio bisa digunakan.", "action": "Aris menarik tuas daya lalu menstabilkan sistem ventilasi.", "location": "Ruang generator"},
    {"scene": "4", "visual": "Aftershock mengguncang bunker; keluarga menghadapi koridor servis yang tergenang dan tertutup reruntuhan.", "desc": "Jam ke-30. Persediaan mulai menipis sehingga Aris harus keluar sebentar, meski abu dan air membuat perjalanan berbahaya.", "action": "Aris memilih rute aman, membawa perlengkapan secukupnya, lalu mencari sumber daya.", "location": "Koridor servis / rute ekspedisi"},
    {"scene": "5", "visual": "Di ruang radio, Aris menerima sinyal lemah sementara Sarah dan Maya menunggu dengan cemas.", "desc": "Hari ke-3. Daya cadangan tinggal sedikit. Satu transmisi yang jelas dapat menentukan apakah SAR menemukan bunker.", "action": "Aris menyetel radio VHF dan mengirim koordinat Bunker 72.", "location": "Ruang radio bunker"},
    {"scene": "6", "visual": "Palka terbuka menuju cahaya pagi; keluarga keluar bersama setelah jendela penyelamatan tercapai.", "desc": "Jam ke-72. Tim SAR mengonfirmasi posisi. Keputusan tentang air, daya, ekspedisi, dan keluarga membentuk hasil akhir.", "action": "Aris menggandeng Maya dan Sarah menuju petugas penyelamat.", "location": "Pintu keluar / titik evakuasi"},
]

img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img)
margin_x = 72
title_y = 55
draw.text((margin_x, title_y), "STORYBOARD GAME", font=TITLE, fill=INK)
draw.line((margin_x, title_y + 83, margin_x + 570, title_y + 83), fill=ACCENT, width=6)
draw.text((margin_x, title_y + 103), "Judul Game : BUNKER 72 — 72 JAM PERTAMA", font=SUBTITLE, fill=INK)
draw.text((W - 620, title_y + 112), "Konsep visual naratif", font=SMALL, fill=MUTED)

x0 = margin_x
y0 = 250
col_w = [125, 905, 670, 560, 196]
header_h = 118
row_h = 456
xs = [x0]
for width in col_w:
    xs.append(xs[-1] + width)

for i in range(len(col_w)):
    draw.rectangle((xs[i], y0, xs[i + 1], y0 + header_h), fill=HEADER, outline=INK, width=3)
headers = ["SCENE", "SKETSA / VISUAL", "KETERANGAN / ADEGAN", "AKSI KARAKTER", "LOKASI"]
for i, label in enumerate(headers):
    tw = draw.textbbox((0, 0), label, font=HEAD)[2]
    draw.text((xs[i] + (col_w[i] - tw) / 2, y0 + 40), label, font=HEAD, fill=(248, 245, 236))

for index, (row, panel) in enumerate(zip(rows, panels)):
    y = y0 + header_h + index * row_h
    for i in range(len(col_w)):
        draw.rectangle((xs[i], y, xs[i + 1], y + row_h), fill=CELL, outline=GRID, width=3)
    num_box = draw.textbbox((0, 0), row["scene"], font=SCENE)
    draw.text((xs[0] + (col_w[0] - (num_box[2] - num_box[0])) / 2, y + 185), row["scene"], font=SCENE, fill=INK)
    art = fit_image(panel, (865, 332))
    art_x = xs[1] + 20
    art_y = y + 18
    img.paste(art, (art_x, art_y))
    draw.rectangle((art_x, art_y, art_x + art.width, art_y + art.height), outline=(221, 214, 201), width=2)
    draw_wrapped(draw, (xs[1] + 22, y + 360), row["visual"], SMALL, MUTED, col_w[1] - 44, line_gap=4)
    draw_wrapped(draw, (xs[2] + 24, y + 32), row["desc"], BODY, INK, col_w[2] - 48, line_gap=12)
    draw_wrapped(draw, (xs[3] + 24, y + 32), row["action"], BODY, INK, col_w[3] - 48, line_gap=12)
    draw_wrapped(draw, (xs[4] + 14, y + 170), row["location"], BODY_BOLD, INK, col_w[4] - 28, line_gap=10, align="center")

footer_y = y0 + header_h + len(rows) * row_h + 26
draw.line((margin_x, footer_y, W - margin_x, footer_y), fill=ACCENT, width=3)
draw.text((margin_x, footer_y + 20), "Alur emosi: urgensi → perlindungan → persiapan → risiko → harapan → penyelamatan", font=SMALL, fill=MUTED)
img.save(OUT, quality=96)
print(OUT)
