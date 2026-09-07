from PIL import Image

ref = Image.open('C:/Users/grady/.gemini/antigravity/brain/e6cd40d8-daf9-45e4-92b3-5781e23056ca/.user_uploaded/media_1788488073480.png')
bg = Image.open('src/assets/backgrounds/scavenger_house_map.webp')

rw, rh = ref.size
bw, bh = bg.size

print(f"Ref: {rw}x{rh}, BG: {bw}x{bh}")
scale_x = bw / rw
scale_y = bh / rh
print(f"Scale: x={scale_x:.5f}, y={scale_y:.5f}")

# Let's inspect the exact pixel bounds in ref for:
# 1. Pintu Ruang Kerja
# In ref, Ruang Kerja west wall has orange pixels around x=723..745, y=240..290
office_door_pixels = []
for y in range(230, 310):
    for x in range(715, 750):
        r, g, b = ref.getpixel((x, y))[:3]
        if r > 180 and 80 < g < 160 and b < 50:
            office_door_pixels.append((x, y))

if office_door_pixels:
    ox1 = min(p[0] for p in office_door_pixels)
    ox2 = max(p[0] for p in office_door_pixels)
    oy1 = min(p[1] for p in office_door_pixels)
    oy2 = max(p[1] for p in office_door_pixels)
    print(f"Ref Office Door: x=[{ox1},{ox2}], y=[{oy1},{oy2}] -> BG: x=[{round(ox1*scale_x)},{round(ox2*scale_x)}], y=[{round(oy1*scale_y)},{round(oy2*scale_y)}]")

# 2. Pintu Kamar Utama
master_door_pixels = []
for y in range(130, 190):
    for x in range(275, 300):
        r, g, b = ref.getpixel((x, y))[:3]
        if r > 180 and 80 < g < 160 and b < 50:
            master_door_pixels.append((x, y))

if master_door_pixels:
    mx1 = min(p[0] for p in master_door_pixels)
    mx2 = max(p[0] for p in master_door_pixels)
    my1 = min(p[1] for p in master_door_pixels)
    my2 = max(p[1] for p in master_door_pixels)
    print(f"Ref Master Door: x=[{mx1},{mx2}], y=[{my1},{my2}] -> BG: x=[{round(mx1*scale_x)},{round(mx2*scale_x)}], y=[{round(my1*scale_y)},{round(my2*scale_y)}]")

# 3. Pintu Kamar Mandi
bath_door_pixels = []
for y in range(430, 490):
    for x in range(305, 330):
        r, g, b = ref.getpixel((x, y))[:3]
        if r > 180 and 80 < g < 160 and b < 50:
            bath_door_pixels.append((x, y))

if bath_door_pixels:
    bx1 = min(p[0] for p in bath_door_pixels)
    bx2 = max(p[0] for p in bath_door_pixels)
    by1 = min(p[1] for p in bath_door_pixels)
    by2 = max(p[1] for p in bath_door_pixels)
    print(f"Ref Bath Door: x=[{bx1},{bx2}], y=[{by1},{by2}] -> BG: x=[{round(bx1*scale_x)},{round(bx2*scale_x)}], y=[{round(by1*scale_y)},{round(by2*scale_y)}]")

# 4. Pintu Kamar Anak
child_door_pixels = []
for y in range(130, 190):
    for x in range(715, 740):
        r, g, b = ref.getpixel((x, y))[:3]
        if r > 180 and 80 < g < 160 and b < 50:
            child_door_pixels.append((x, y))

if child_door_pixels:
    cx1 = min(p[0] for p in child_door_pixels)
    cx2 = max(p[0] for p in child_door_pixels)
    cy1 = min(p[1] for p in child_door_pixels)
    cy2 = max(p[1] for p in child_door_pixels)
    print(f"Ref Child Door: x=[{cx1},{cx2}], y=[{cy1},{cy2}] -> BG: x=[{round(cx1*scale_x)},{round(cx2*scale_x)}], y=[{round(cy1*scale_y)},{round(cy2*scale_y)}]")

# 5. Pintu Utama
main_door_pixels = []
for y in range(410, 460):
    for x in range(480, 540):
        r, g, b = ref.getpixel((x, y))[:3]
        if r > 180 and 80 < g < 160 and b < 50:
            main_door_pixels.append((x, y))

if main_door_pixels:
    px1 = min(p[0] for p in main_door_pixels)
    px2 = max(p[0] for p in main_door_pixels)
    py1 = min(p[1] for p in main_door_pixels)
    py2 = max(p[1] for p in main_door_pixels)
    print(f"Ref Main Door: x=[{px1},{px2}], y=[{py1},{py2}] -> BG: x=[{round(px1*scale_x)},{round(px2*scale_x)}], y=[{round(py1*scale_y)},{round(py2*scale_y)}]")
