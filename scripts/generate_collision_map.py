import os
import math
from PIL import Image, ImageDraw, ImageFont

BASE_W, BASE_H = 1672, 941
SCALE = 2
WIDTH, HEIGHT = BASE_W * SCALE, BASE_H * SCALE

# Theme: Architectural Tactical Blueprint
BG_COLOR = (10, 17, 30)              # Deep Tactical Slate
GRID_COLOR = (20, 34, 58)            # Major Grid (40px)
GRID_SUB_COLOR = (14, 24, 42)        # Minor Grid (10px)

WALL_FILL = (24, 35, 54, 240)        # Dark Slate solid wall body
WALL_BORDER = (56, 189, 248)         # Cyan perimeter outline

DOOR_FILL = (16, 185, 129, 85)       # Emerald transparent fill
DOOR_BORDER = (52, 211, 153)         # Emerald neon outline
DOOR_ARC = (16, 185, 129, 180)

COLLISION_FILL = (217, 119, 6, 80)   # Amber transparent fill
COLLISION_BORDER = (251, 191, 36)    # Amber solid outline
BADGE_FILL = (41, 19, 3, 235)        # Dark amber pill background
TEXT_COLLISION = (254, 240, 138)     # Soft bright yellow

TEXT_DOOR = (209, 250, 229)          # Mint white
TEXT_TITLE = (248, 250, 252)
TEXT_SUB = (148, 163, 184)
TEXT_ROOM = (186, 230, 253)

FONT_PATH = 'C:/Windows/Fonts/segoeui.ttf'
FONT_BOLD_PATH = 'C:/Windows/Fonts/segoeuib.ttf'
if not os.path.exists(FONT_BOLD_PATH):
    FONT_BOLD_PATH = FONT_PATH

font_title = ImageFont.truetype(FONT_BOLD_PATH, int(18 * SCALE))
font_room = ImageFont.truetype(FONT_BOLD_PATH, int(13 * SCALE))
font_label = ImageFont.truetype(FONT_BOLD_PATH, int(8.5 * SCALE))
font_label_sm = ImageFont.truetype(FONT_BOLD_PATH, int(7.8 * SCALE))
font_legend_t = ImageFont.truetype(FONT_BOLD_PATH, int(10.5 * SCALE))
font_legend = ImageFont.truetype(FONT_BOLD_PATH, int(8.5 * SCALE))
font_sub = ImageFont.truetype(FONT_PATH, int(8 * SCALE))

base_img = Image.new('RGBA', (WIDTH, HEIGHT), BG_COLOR)
overlay = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
draw = ImageDraw.Draw(base_img)
draw_ov = ImageDraw.Draw(overlay)

def s(val):
    return int(val * SCALE)

def rect_s(r):
    return (s(r[0]), s(r[1]), s(r[0] + r[2]), s(r[1] + r[3]))

# 1. Technical Grid
grid_step = 40 * SCALE
for x in range(0, WIDTH, grid_step):
    draw.line([(x, 0), (x, HEIGHT)], fill=GRID_COLOR, width=1)
for y in range(0, HEIGHT, grid_step):
    draw.line([(0, y), (WIDTH, y)], fill=GRID_COLOR, width=1)

sub_step = 10 * SCALE
for x in range(0, WIDTH, sub_step):
    if x % grid_step != 0:
        draw.line([(x, 0), (x, HEIGHT)], fill=GRID_SUB_COLOR, width=1)
for y in range(0, HEIGHT, sub_step):
    if y % grid_step != 0:
        draw.line([(0, y), (WIDTH, y)], fill=GRID_SUB_COLOR, width=1)

# Coordinate tick marks
for x in range(0, WIDTH, 100 * SCALE):
    draw.line([(x, 0), (x, s(8))], fill=WALL_BORDER, width=2)
    draw.line([(x, HEIGHT - s(8)), (x, HEIGHT)], fill=WALL_BORDER, width=2)
    draw.text((x + s(3), s(10)), str(x // SCALE), font=font_sub, fill=TEXT_SUB)
for y in range(0, HEIGHT, 100 * SCALE):
    draw.line([(0, y), (s(8), y)], fill=WALL_BORDER, width=2)
    draw.line([(WIDTH - s(8), y), (WIDTH, y)], fill=WALL_BORDER, width=2)
    draw.text((s(10), y + s(2)), str(y // SCALE), font=font_sub, fill=TEXT_SUB)

# 2. Room Title Banners (Zonasi Ruangan - placed in open floor zones)
ROOMS = [
    {'name': 'KAMAR TIDUR UTAMA (MASTER BEDROOM)', 'pos': (210, 52)},
    {'name': 'RUANG PALKA BUNKER 72 (VAULT / SHELTER)', 'pos': (830, 255)},
    {'name': 'KAMAR TIDUR ANAK (CHILD BEDROOM)', 'pos': (1360, 215)},
    {'name': 'DAPUR & PANTRY (KITCHEN)', 'pos': (210, 270)},
    {'name': 'RUANG MAKAN (DINING ROOM)', 'pos': (210, 555)},
    {'name': 'KAMAR MANDI', 'pos': (415, 435)},
    {'name': 'RUANG KELUARGA & TV (LIVING ROOM)', 'pos': (850, 310)},
    {'name': 'RUANG KERJA & STUDIO (OFFICE)', 'pos': (1400, 715)},
    {'name': 'TERAS DEPAN & FOYER (ENTRANCE)', 'pos': (840, 885)}
]

for r in ROOMS:
    cx, cy = s(r['pos'][0]), s(r['pos'][1])
    text = r['name']
    bbox = font_room.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    px, py = cx - tw // 2, cy - th // 2
    draw_ov.rounded_rectangle([px - s(8), py - s(3), px + tw + s(8), py + th + s(3)], radius=s(4), fill=(15, 23, 42, 220), outline=(71, 85, 105, 210), width=1)
    draw_ov.text((px, py), text, font=font_room, fill=TEXT_ROOM)

# 3. Walls (Tembok Struktural)
WALLS = [
    # Perimeter
    {'name': 'Tembok Barat Luar', 'rect': (8, 18, 22, 792)},
    {'name': 'Tembok Timur Luar', 'rect': (1638, 18, 24, 792)},
    {'name': 'Tembok Selatan Kiri', 'rect': (8, 804, 622, 24)},
    {'name': 'Tembok Selatan Kanan', 'rect': (1050, 804, 612, 24)},

    # Kamar Tidur Utama
    {'name': 'Tembok Utara Kamar Utama', 'rect': (28, 18, 432, 22)},
    {'name': 'Tembok Barat Kamar Utama', 'rect': (28, 18, 22, 270)},
    {'name': 'Tembok Pemisah Kamar & Dapur', 'rect': (8, 282, 452, 24)},
    {'name': 'Tembok Timur Kamar Utama', 'rect': (450, 18, 22, 212)},
    {'name': 'Tembok Lorong Kamar Utama Atas', 'rect': (450, 92, 112, 22)},

    # Ruang Bunker 72
    {'name': 'Tembok Utara Bunker', 'rect': (562, 10, 516, 26)},
    {'name': 'Tembok Barat Bunker', 'rect': (562, 10, 22, 225)},
    {'name': 'Tembok Timur Bunker', 'rect': (1056, 10, 22, 225)},
    {'name': 'Tembok Depan Bunker Kiri', 'rect': (562, 205, 170, 30)},
    {'name': 'Tembok Depan Bunker Kanan', 'rect': (868, 205, 210, 30)},

    # Kamar Tidur Anak
    {'name': 'Tembok Utara Kamar Anak', 'rect': (1155, 18, 485, 22)},
    {'name': 'Tembok Barat Kamar Anak', 'rect': (1155, 18, 22, 212)},
    {'name': 'Tembok Lorong Kamar Anak Atas', 'rect': (1078, 92, 98, 22)},
    {'name': 'Tembok Selatan Kamar Anak', 'rect': (1155, 298, 485, 22)},
    {'name': 'Tembok Timur Kamar Anak', 'rect': (1620, 18, 22, 302)},

    # Dapur & Kamar Mandi
    {'name': 'Tembok Pembatas Dapur/Living', 'rect': (488, 282, 22, 158)},
    {'name': 'Tembok Utara Kamar Mandi', 'rect': (325, 545, 183, 20)},
    {'name': 'Tembok Barat Kamar Mandi', 'rect': (325, 545, 20, 260)},
    {'name': 'Tembok Timur Kamar Mandi Atas', 'rect': (488, 545, 20, 170)},
    {'name': 'Tembok Timur Kamar Mandi Bawah', 'rect': (488, 775, 20, 33)},
    {'name': 'Tembok Bawah Kamar Mandi', 'rect': (325, 780, 183, 28)},

    # Ruang Kerja & Studio
    {'name': 'Tembok Utara Studio', 'rect': (1180, 355, 460, 22)},
    {'name': 'Tembok Barat Studio Atas', 'rect': (1180, 355, 22, 50)},
    {'name': 'Tembok Barat Studio Bawah', 'rect': (1180, 465, 22, 343)},

    # Teras Depan & Foyer
    {'name': 'Tembok Barat Foyer', 'rect': (630, 680, 22, 235)},
    {'name': 'Tembok Timur Foyer', 'rect': (1035, 680, 22, 235)},
    {'name': 'Tembok Depan Foyer Kiri', 'rect': (630, 680, 165, 25)},
    {'name': 'Tembok Depan Foyer Kanan', 'rect': (875, 680, 162, 25)},
    {'name': 'Batas Teras Bawah', 'rect': (630, 915, 427, 20)}
]

for w in WALLS:
    box = rect_s(w['rect'])
    draw_ov.rectangle(box, fill=WALL_FILL, outline=WALL_BORDER, width=max(2, int(2 * SCALE)))

# 4. Doors & Entryways (Pintu & Akses Masuk)
DOORS = [
    {
        'name': 'PINTU KAMAR UTAMA',
        'rect': (450, 230, 22, 52),
        'arc': (450, 282, 52, 270, 360),
        'badge': (490, 255)
    },
    {
        'name': 'AMBANG MASUK BUNKER',
        'rect': (732, 205, 136, 30),
        'arc': None,
        'badge': (800, 220)
    },
    {
        'name': 'PINTU PALKA BUNKER (VAULT)',
        'rect': (745, 35, 110, 125),
        'arc': None,
        'badge': (800, 100)
    },
    {
        'name': 'PINTU KAMAR ANAK',
        'rect': (1155, 230, 22, 55),
        'arc': (1155, 285, 55, 270, 360),
        'badge': (1115, 255)
    },
    {
        'name': 'PINTU STUDIO / KANTOR',
        'rect': (1180, 405, 22, 60),
        'arc': (1180, 405, 60, 0, 90),
        'badge': (1240, 435)
    },
    {
        'name': 'PINTU KAMAR MANDI',
        'rect': (488, 715, 20, 60),
        'arc': (488, 775, 60, 270, 360),
        'badge': (450, 745)
    },
    {
        'name': 'PINTU UTAMA RUMAH',
        'rect': (795, 680, 80, 25),
        'arc': (795, 680, 80, 0, 90),
        'badge': (835, 665)
    }
]

for d in DOORS:
    box = rect_s(d['rect'])
    draw_ov.rectangle(box, fill=DOOR_FILL, outline=DOOR_BORDER, width=max(2, int(2.2 * SCALE)))
    if d['arc']:
        cx, cy, rad, a1, a2 = d['arc']
        scx, scy, srad = s(cx), s(cy), s(rad)
        draw_ov.arc([scx - srad, scy - srad, scx + srad, scy + srad], a1, a2, fill=DOOR_ARC, width=max(1, int(1.8 * SCALE)))

    # Door Badge
    bx, by = s(d['badge'][0]), s(d['badge'][1])
    text = d['name']
    bbox = font_label.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    px, py = bx - tw // 2, by - th // 2
    draw_ov.rounded_rectangle([px - s(5), py - s(3), px + tw + s(5), py + th + s(3)], radius=s(3), fill=(6, 78, 59, 240), outline=DOOR_BORDER, width=1)
    draw_ov.text((px, py), text, font=font_label, fill=TEXT_DOOR)

# 5. Collision Objects / Furniture (Barang Ber-Collision)
OBJECTS = [
    # ── Kamar Tidur Utama ──
    {'name': 'Kasur King Size', 'rect': (95, 90, 165, 155)},
    {'name': 'Nakas Kiri', 'rect': (68, 105, 24, 38)},
    {'name': 'Nakas Kanan', 'rect': (263, 105, 24, 38)},
    {'name': 'Meja Rias', 'rect': (320, 55, 65, 75)},
    {'name': 'Lemari Pakaian', 'rect': (385, 55, 65, 150)},
    {'name': 'Tanaman Hias', 'rect': (35, 55, 30, 35)},

    # ── Bunker 72 ──
    {'name': 'Rak Logistik Bunker', 'rect': (585, 48, 100, 165)},
    {'name': 'Panel Listrik / Server', 'rect': (880, 38, 165, 75)},
    {'name': 'Generator Darurat', 'rect': (920, 125, 115, 85)},

    # ── Kamar Tidur Anak ──
    {'name': 'Lemari Pakaian Anak', 'rect': (1210, 55, 85, 105)},
    {'name': 'Rak Buku & Mainan', 'rect': (1300, 80, 60, 78)},
    {'name': 'Meja Belajar & Kursi', 'rect': (1370, 78, 105, 75)},
    {'name': 'Kursi Belajar', 'rect': (1400, 155, 45, 45)},
    {'name': 'Kasur Single Anak', 'rect': (1490, 85, 95, 170)},
    {'name': 'Laci Mainan', 'rect': (1510, 260, 55, 38)},
    {'name': 'Tanaman Hias Jendela', 'rect': (1590, 195, 30, 45)},

    # ── Dapur & Ruang Makan ──
    {'name': 'Meja Counter Dapur L-Shape', 'rect': (30, 315, 315, 75)},
    {'name': 'Bak Cuci Piring (Sink)', 'rect': (30, 390, 65, 155)},
    {'name': 'Kulkas 2 Pintu', 'rect': (345, 320, 75, 95)},
    {'name': 'Rak Sembako (Pantry)', 'rect': (445, 320, 40, 95)},
    {'name': 'Kitchen Island & Kursi Bar', 'rect': (175, 448, 190, 85)},
    {'name': 'Meja Makan & 6 Kursi', 'rect': (85, 595, 185, 145)},
    {'name': 'Tanaman Hias Dapur', 'rect': (30, 740, 35, 45)},

    # ── Kamar Mandi ──
    {'name': 'Bilik Shower Kaca', 'rect': (335, 555, 55, 105)},
    {'name': 'Kloset / Toilet', 'rect': (430, 605, 25, 40)},
    {'name': 'Wastafel & Cermin', 'rect': (455, 575, 35, 80)},
    {'name': 'Bathtub Berendam', 'rect': (335, 685, 75, 85)},

    # ── Ruang Keluarga ──
    {'name': 'Sofa L (Sayap Kiri)', 'rect': (675, 335, 55, 245)},
    {'name': 'Sofa L (Sayap Bawah)', 'rect': (730, 525, 130, 55)},
    {'name': 'Meja Kopi Ruang Tamu', 'rect': (770, 400, 80, 90)},
    {'name': 'Kursi Armchair', 'rect': (875, 400, 52, 52)},
    {'name': 'Rak TV & Media Unit', 'rect': (1015, 345, 50, 175)},
    {'name': 'Tanaman Sudut Sofa', 'rect': (668, 315, 35, 35)},
    {'name': 'Meja Samping Sofa', 'rect': (868, 535, 38, 35)},

    # ── Ruang Kerja & Studio ──
    {'name': 'Rak Lemari Arsip Utara', 'rect': (1340, 445, 175, 65)},
    {'name': 'Rak Server & Radio Ham', 'rect': (1565, 440, 65, 325)},
    {'name': 'Meja Kerja PC', 'rect': (1290, 540, 65, 160)},
    {'name': 'Meja Utama Monitor', 'rect': (1355, 565, 140, 75)},
    {'name': 'Kursi Kerja Kantor', 'rect': (1375, 640, 48, 48)},
    {'name': 'Tanaman Hias Studio', 'rect': (1195, 755, 40, 50)},

    # ── Teras Depan & Foyer ──
    {'name': 'Meja Konsol Foyer', 'rect': (668, 752, 92, 58)},
    {'name': 'Gantungan Jaket & Tanaman', 'rect': (955, 750, 72, 80)}
]

for obj in OBJECTS:
    box = rect_s(obj['rect'])
    draw_ov.rounded_rectangle(box, radius=s(3), fill=COLLISION_FILL, outline=COLLISION_BORDER, width=max(1, int(1.8 * SCALE)))
    
    text = obj['name']
    bbox = font_label_sm.getbbox(text)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    
    cx = (box[0] + box[2]) // 2
    cy = (box[1] + box[3]) // 2
    px = cx - tw // 2
    py = cy - th // 2
    
    draw_ov.rounded_rectangle([px - s(4), py - s(2), px + tw + s(4), py + th + s(2)], radius=s(2), fill=BADGE_FILL, outline=COLLISION_BORDER, width=1)
    draw_ov.text((px, py), text, font=font_label_sm, fill=TEXT_COLLISION)

# 6. Title Block / Header Banner (Placed at Bottom Left empty zone)
header_box = [s(25), s(835), s(600), s(915)]
draw_ov.rounded_rectangle(header_box, radius=s(6), fill=(15, 23, 42, 240), outline=WALL_BORDER, width=2)
draw_ov.text((s(40), s(845)), 'BUNKER 72 — BLUEPRINT COLLISION MAP', font=font_title, fill=TEXT_TITLE)
draw_ov.text((s(40), s(875)), 'OUTLINE TEMBOK | AKSES PINTU | OBJEK DENGAN COLLISION (SKALA 1:1)', font=font_sub, fill=TEXT_SUB)

# 7. Legend Box (Bottom Right)
leg_w, leg_h = s(440), s(125)
leg_x, leg_y = WIDTH - leg_w - s(25), HEIGHT - leg_h - s(25)
draw_ov.rounded_rectangle([leg_x, leg_y, leg_x + leg_w, leg_y + leg_h], radius=s(6), fill=(15, 23, 42, 240), outline=(100, 116, 139), width=2)
draw_ov.text((leg_x + s(15), leg_y + s(10)), 'LEGENDA COLLISION & ELEMEN MAP', font=font_legend_t, fill=(255, 255, 255))

legend_items = [
    ('TEMBOK (WALL COLLIDER)', WALL_FILL, WALL_BORDER, 'Tembok batas struktural tidak dapat dilewati'),
    ('PINTU / AKSES MASUK (DOOR)', DOOR_FILL, DOOR_BORDER, 'Titik sirkulasi atau transisi antar ruangan'),
    ('OBJEK TABRAKAN (COLLISION)', COLLISION_FILL, COLLISION_BORDER, 'Perabotan / rintangan fisik yang ber-collision')
]

cur_y = leg_y + s(33)
for title, fcolor, bcolor, desc in legend_items:
    draw_ov.rectangle([leg_x + s(15), cur_y + s(2), leg_x + s(35), cur_y + s(18)], fill=fcolor, outline=bcolor, width=2)
    draw_ov.text((leg_x + s(45), cur_y), title, font=font_legend, fill=(241, 245, 249))
    draw_ov.text((leg_x + s(245), cur_y + s(1)), '- ' + desc, font=font_sub, fill=TEXT_SUB)
    cur_y += s(26)

# Composite and save
final_img = Image.alpha_composite(base_img, overlay)

out_hi_png = 'src/assets/backgrounds/scavenger_house_collision_map_hd.png'
final_img.save(out_hi_png, 'PNG')
print('Saved HD:', out_hi_png)

native_img = final_img.resize((BASE_W, BASE_H), Image.Resampling.LANCZOS)
out_native_png = 'src/assets/backgrounds/scavenger_house_collision_map.png'
out_native_webp = 'src/assets/backgrounds/scavenger_house_collision_map.webp'
native_img.save(out_native_png, 'PNG')
native_img.save(out_native_webp, 'WEBP', quality=95)
print('Saved Native:', out_native_png, out_native_webp)

# Also copy to artifacts directory for direct user viewing
art_dir = 'C:/Users/grady/.gemini/antigravity/brain/ca42e5ee-6292-4cb1-a16d-0274e6bcf71e'
if os.path.exists(art_dir):
    art_png = os.path.join(art_dir, 'scavenger_house_collision_map.png')
    native_img.save(art_png, 'PNG')
    print('Saved to Artifacts:', art_png)