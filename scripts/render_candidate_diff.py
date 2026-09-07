import sys
sys.path.append('scripts')
from PIL import Image, ImageDraw, ImageFont
from candidate_colliders import CANDIDATE_COLLIDERS, CANDIDATE_WALKABLE_OPENINGS

base = Image.open('scripts/bg_with_ref_features.png').convert('RGBA')
overlay = Image.new('RGBA', base.size, (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay)

# Draw walkable openings in green
for d in CANDIDATE_WALKABLE_OPENINGS:
    draw.rectangle([d['x'], d['y'], d['x'] + d['w'], d['y'] + d['h']], fill=(16, 185, 129, 90), outline=(52, 211, 153, 255), width=2)

# Draw candidate colliders (walls red, furniture amber)
for c in CANDIDATE_COLLIDERS:
    if c['type'] == 'wall':
        draw.rectangle([c['x'], c['y'], c['x'] + c['w'], c['y'] + c['h']], fill=(239, 68, 68, 90), outline=(239, 68, 68, 255), width=2)
    else:
        draw.rectangle([c['x'], c['y'], c['x'] + c['w'], c['y'] + c['h']], fill=(245, 158, 11, 90), outline=(245, 158, 11, 255), width=2)

composite = Image.alpha_composite(base, overlay)
composite.save('scripts/diff_candidate_vs_ref.png')
print('Candidate diff saved to scripts/diff_candidate_vs_ref.png')
