import json
from PIL import Image, ImageDraw, ImageFont

# Candidate Colliders based on the reference blueprint media_1788488073480.png
CANDIDATE_COLLIDERS = [
    # ── 1. Outer Perimeter & Exterior Shell ──
    { 'id': 'outer_west',            'type': 'wall',      'x': 8,    'y': 18,  'w': 22,  'h': 792 },
    { 'id': 'outer_east',            'type': 'wall',      'x': 1638, 'y': 18,  'w': 24,  'h': 792 },
    { 'id': 'outer_south_left',      'type': 'wall',      'x': 8,    'y': 804, 'w': 622, 'h': 24 },
    { 'id': 'outer_south_right',     'type': 'wall',      'x': 1050, 'y': 804, 'w': 612, 'h': 24 },

    # ── 2. Master Bedroom Shell & Entry ──
    { 'id': 'master_wall_north',     'type': 'wall',      'x': 28,   'y': 18,  'w': 432, 'h': 22 },
    { 'id': 'master_wall_west',      'type': 'wall',      'x': 28,   'y': 18,  'w': 22,  'h': 270 },
    { 'id': 'master_wall_south',     'type': 'wall',      'x': 8,    'y': 282, 'w': 452, 'h': 24 },
    # East wall: solid from y=18 to y=230, opening at y=230..282, door connecting to living corridor
    { 'id': 'master_wall_east',      'type': 'wall',      'x': 450,  'y': 18,  'w': 22,  'h': 212 },
    # North wall of master alcove corridor
    { 'id': 'master_corridor_north', 'type': 'wall',      'x': 450,  'y': 92,  'w': 112, 'h': 22 },

    # Master Bedroom Furniture
    { 'id': 'master_bed',            'type': 'furniture', 'x': 95,   'y': 90,  'w': 165, 'h': 155 },
    { 'id': 'master_nightstand_l',   'type': 'furniture', 'x': 68,   'y': 105, 'w': 24,  'h': 38 },
    { 'id': 'master_nightstand_r',   'type': 'furniture', 'x': 263,  'y': 105, 'w': 24,  'h': 38 },
    { 'id': 'master_dresser',        'type': 'furniture', 'x': 320,  'y': 55,  'w': 65,  'h': 75 },
    { 'id': 'master_wardrobe',       'type': 'furniture', 'x': 385,  'y': 55,  'w': 65,  'h': 150 },
    { 'id': 'master_plant',          'type': 'furniture', 'x': 35,   'y': 55,  'w': 30,  'h': 35 },

    # ── 3. Bunker 72 Shelter Shell & Equipment ──
    { 'id': 'bunker_wall_north',     'type': 'wall',      'x': 562,  'y': 10,  'w': 516, 'h': 26 },
    { 'id': 'bunker_wall_west',      'type': 'wall',      'x': 562,  'y': 10,  'w': 22,  'h': 225 },
    { 'id': 'bunker_wall_east',      'type': 'wall',      'x': 1056, 'y': 10,  'w': 22,  'h': 225 },
    { 'id': 'bunker_wall_front_l',   'type': 'wall',      'x': 562,  'y': 205, 'w': 170, 'h': 30 },
    { 'id': 'bunker_wall_front_r',   'type': 'wall',      'x': 868,  'y': 205, 'w': 210, 'h': 30 },

    # Bunker Equipment
    { 'id': 'bunker_shelves',        'type': 'furniture', 'x': 585,  'y': 48,  'w': 100, 'h': 165 },
    { 'id': 'bunker_vault_door',     'type': 'furniture', 'x': 745,  'y': 35,  'w': 110, 'h': 125 },
    { 'id': 'bunker_power_panel',    'type': 'furniture', 'x': 880,  'y': 38,  'w': 165, 'h': 75 },
    { 'id': 'bunker_generator',      'type': 'furniture', 'x': 920,  'y': 125, 'w': 115, 'h': 85 },

    # ── 4. Child Bedroom Shell & Furniture ──
    { 'id': 'child_wall_north',      'type': 'wall',      'x': 1155, 'y': 18,  'w': 485, 'h': 22 },
    { 'id': 'child_wall_east',       'type': 'wall',      'x': 1620, 'y': 18,  'w': 22,  'h': 302 },
    { 'id': 'child_wall_south',      'type': 'wall',      'x': 1155, 'y': 298, 'w': 485, 'h': 22 },
    # West wall: solid from y=18 to y=230, opening at y=230..285, door connecting to living corridor
    { 'id': 'child_wall_west',       'type': 'wall',      'x': 1155, 'y': 18,  'w': 22,  'h': 212 },
    # North wall of child alcove corridor
    { 'id': 'child_corridor_north',  'type': 'wall',      'x': 1078, 'y': 92,  'w': 98,  'h': 22 },

    # Child Bedroom Furniture
    { 'id': 'child_wardrobe',        'type': 'furniture', 'x': 1210, 'y': 55,  'w': 85,  'h': 105 },
    { 'id': 'child_bookshelf',       'type': 'furniture', 'x': 1300, 'y': 80,  'w': 60,  'h': 78 },
    { 'id': 'child_study_desk',      'type': 'furniture', 'x': 1370, 'y': 78,  'w': 105, 'h': 75 },
    { 'id': 'child_chair',           'type': 'furniture', 'x': 1400, 'y': 155, 'w': 45,  'h': 45 },
    { 'id': 'child_bed',             'type': 'furniture', 'x': 1490, 'y': 85,  'w': 95,  'h': 170 },
    { 'id': 'child_drawers',         'type': 'furniture', 'x': 1510, 'y': 260, 'w': 55,  'h': 38 },
    { 'id': 'child_plant',           'type': 'furniture', 'x': 1590, 'y': 195, 'w': 30,  'h': 45 },

    # ── 5. Office / Studio Shell & Furniture ──
    # North wall is completely solid separating office from child bedroom!
    { 'id': 'office_wall_north',     'type': 'wall',      'x': 1180, 'y': 355, 'w': 460, 'h': 22 },
    # West wall: top segment above door (y=355..405), opening at y=405..465 (doorway), bottom segment (y=465..804)
    { 'id': 'office_wall_west_top',  'type': 'wall',      'x': 1180, 'y': 355, 'w': 22,  'h': 50 },
    { 'id': 'office_wall_west_bot',  'type': 'wall',      'x': 1180, 'y': 465, 'w': 22,  'h': 343 },

    # Office Furniture
    { 'id': 'office_shelves_north',  'type': 'furniture', 'x': 1340, 'y': 445, 'w': 175, 'h': 65 },
    { 'id': 'office_shelves_east',   'type': 'furniture', 'x': 1565, 'y': 440, 'w': 65,  'h': 325 },
    { 'id': 'office_desk_left',      'type': 'furniture', 'x': 1290, 'y': 540, 'w': 65,  'h': 160 },
    { 'id': 'office_desk_back',      'type': 'furniture', 'x': 1355, 'y': 565, 'w': 140, 'h': 75 },
    { 'id': 'office_chair',          'type': 'furniture', 'x': 1375, 'y': 640, 'w': 48,  'h': 48 },
    { 'id': 'office_plant',          'type': 'furniture', 'x': 1195, 'y': 755, 'w': 40,  'h': 50 },

    # ── 6. Kitchen & Dining Shell & Furniture ──
    { 'id': 'kitchen_wall_divider',  'type': 'wall',      'x': 488,  'y': 282, 'w': 22,  'h': 158 },
    { 'id': 'kitchen_counter_top',   'type': 'furniture', 'x': 30,   'y': 315, 'w': 315, 'h': 75 },
    { 'id': 'kitchen_counter_left',  'type': 'furniture', 'x': 30,   'y': 390, 'w': 65,  'h': 155 },
    { 'id': 'kitchen_fridge',        'type': 'furniture', 'x': 345,  'y': 320, 'w': 75,  'h': 95 },
    { 'id': 'kitchen_pantry',        'type': 'furniture', 'x': 445,  'y': 320, 'w': 40,  'h': 95 },
    { 'id': 'kitchen_island',        'type': 'furniture', 'x': 175,  'y': 448, 'w': 190, 'h': 85 },
    { 'id': 'dining_table_set',      'type': 'furniture', 'x': 85,   'y': 595, 'w': 185, 'h': 145 },
    { 'id': 'dining_plant',          'type': 'furniture', 'x': 30,   'y': 740, 'w': 35,  'h': 45 },

    # ── 7. Bathroom Shell & Fixtures ──
    # North wall is completely solid separating bathroom from kitchen/dining!
    { 'id': 'bath_wall_north',       'type': 'wall',      'x': 325,  'y': 545, 'w': 183, 'h': 20 },
    { 'id': 'bath_wall_west',        'type': 'wall',      'x': 325,  'y': 545, 'w': 20,  'h': 260 },
    { 'id': 'bath_wall_south',       'type': 'wall',      'x': 325,  'y': 780, 'w': 183, 'h': 28 },
    # East wall: top segment above door (y=545..715), opening at y=715..775 (doorway), bottom segment (y=775..805)
    { 'id': 'bath_wall_east_top',    'type': 'wall',      'x': 488,  'y': 545, 'w': 20,  'h': 170 },
    { 'id': 'bath_wall_east_bot',    'type': 'wall',      'x': 488,  'y': 775, 'w': 20,  'h': 33 },

    # Bathroom Fixtures
    { 'id': 'bath_shower',           'type': 'furniture', 'x': 335,  'y': 555, 'w': 55,  'h': 105 },
    { 'id': 'bath_toilet',           'type': 'furniture', 'x': 430,  'y': 605, 'w': 25,  'h': 40 },
    { 'id': 'bath_vanity',           'type': 'furniture', 'x': 455,  'y': 575, 'w': 35,  'h': 80 },
    { 'id': 'bath_tub',              'type': 'furniture', 'x': 335,  'y': 685, 'w': 75,  'h': 85 },

    # ── 8. Living Room Furniture ──
    { 'id': 'living_sofa_left',      'type': 'furniture', 'x': 675,  'y': 335, 'w': 55,  'h': 245 },
    { 'id': 'living_sofa_bottom',    'type': 'furniture', 'x': 730,  'y': 525, 'w': 130, 'h': 55 },
    { 'id': 'living_coffee_table',   'type': 'furniture', 'x': 770,  'y': 400, 'w': 80,  'h': 90 },
    { 'id': 'living_armchair',       'type': 'furniture', 'x': 875,  'y': 400, 'w': 52,  'h': 52 },
    { 'id': 'living_media_unit',     'type': 'furniture', 'x': 1015, 'y': 345, 'w': 50,  'h': 175 },
    { 'id': 'living_plant_sofa',     'type': 'furniture', 'x': 668,  'y': 315, 'w': 35,  'h': 35 },
    { 'id': 'living_table_sofa',     'type': 'furniture', 'x': 868,  'y': 535, 'w': 38,  'h': 35 },

    # ── 9. Foyer / Main Entrance Shell & Furniture ──
    { 'id': 'foyer_wall_north_l',    'type': 'wall',      'x': 630,  'y': 680, 'w': 165, 'h': 25 },
    { 'id': 'foyer_wall_north_r',    'type': 'wall',      'x': 875,  'y': 680, 'w': 162, 'h': 25 },
    { 'id': 'foyer_wall_west',       'type': 'wall',      'x': 630,  'y': 680, 'w': 22,  'h': 235 },
    { 'id': 'foyer_wall_east',       'type': 'wall',      'x': 1035, 'y': 680, 'w': 22,  'h': 235 },
    { 'id': 'foyer_porch_bottom',    'type': 'wall',      'x': 630,  'y': 915, 'w': 427, 'h': 20 },

    # Foyer Furniture
    { 'id': 'foyer_console_table',   'type': 'furniture', 'x': 668,  'y': 752, 'w': 92,  'h': 58 },
    { 'id': 'foyer_coat_plant',      'type': 'furniture', 'x': 955,  'y': 750, 'w': 72,  'h': 80 },
]

# Candidate Walkable Openings
CANDIDATE_WALKABLE_OPENINGS = [
    { 'id': 'door_foyer_living',     'name': 'Pintu Utama / Foyer',       'x': 795,  'y': 680, 'w': 80,  'h': 25 },
    { 'id': 'door_bunker_entrance',  'name': 'Ambang Masuk Bunker',       'x': 732,  'y': 205, 'w': 136, 'h': 30 },
    { 'id': 'door_master_bedroom',   'name': 'Pintu Kamar Utama',         'x': 450,  'y': 230, 'w': 22,  'h': 52 },
    { 'id': 'door_child_bedroom',    'name': 'Pintu Kamar Anak',          'x': 1155, 'y': 230, 'w': 22,  'h': 55 },
    { 'id': 'door_office_studio',    'name': 'Pintu Studio / Kantor',     'x': 1180, 'y': 405, 'w': 22,  'h': 60 },
    { 'id': 'door_bathroom',         'name': 'Pintu Kamar Mandi',         'x': 488,  'y': 715, 'w': 20,  'h': 60 },
    { 'id': 'hall_master_alcove',    'name': 'Akses Masuk Kamar Utama',   'x': 450,  'y': 92,  'w': 112, 'h': 138 },
    { 'id': 'hall_child_alcove',     'name': 'Akses Masuk Kamar Anak',    'x': 1078, 'y': 92,  'w': 98,  'h': 138 },
    { 'id': 'kitchen_living_passage','name': 'Akses Dapur & Pantry',      'x': 470,  'y': 440, 'w': 50,  'h': 80 },
]

print(f"Candidate colliders count: {len(CANDIDATE_COLLIDERS)}")
print(f"Candidate openings count: {len(CANDIDATE_WALKABLE_OPENINGS)}")
