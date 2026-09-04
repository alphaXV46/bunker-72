import math
import sys
import os
sys.path.append(os.path.dirname(__file__))
from test_new_colliders import NEW_COLLIDERS

PW = 20
PH = 14

bounds = {'x': 18, 'y': 18, 'w': 1636, 'h': 905}

def can_move_to(x, y, colliders, b):
    min_x = b['x']
    max_x = b['x'] + b['w']
    min_y = b['y']
    max_y = b['y'] + b['h']
    
    if (x - PW / 2 < min_x or x + PW / 2 > max_x or
        y - PH / 2 < min_y or y + PH / 2 > max_y):
        return False
        
    for box in colliders:
        if (x - PW / 2 < box['x'] + box['w'] and
            x + PW / 2 > box['x'] and
            y - PH / 2 < box['y'] + box['h'] and
            y + PH / 2 > box['y']):
            return False
    return True

def move_player(px, py, vx, vy, speed, dt, colliders, b):
    if vx != 0 and vy != 0:
        vx *= 0.70710678
        vy *= 0.70710678
        
    total_dist = math.hypot(vx * speed * dt, vy * speed * dt)
    max_step = 4.0
    num_steps = max(1, int(math.ceil(total_dist / max_step)))
    
    step_x = (vx * speed * dt) / num_steps
    step_y = (vy * speed * dt) / num_steps
    
    cur_x = px
    cur_y = py
    
    for _ in range(num_steps):
        next_x = cur_x + step_x
        next_y = cur_y + step_y
        
        if can_move_to(next_x, next_y, colliders, b):
            cur_x = next_x
            cur_y = next_y
        else:
            moved_x = False
            moved_y = False
            
            if abs(step_x) >= abs(step_y):
                if can_move_to(next_x, cur_y, colliders, b):
                    cur_x = next_x
                    moved_x = True
                if can_move_to(cur_x, next_y, colliders, b):
                    cur_y = next_y
                    moved_y = True
            else:
                if can_move_to(cur_x, next_y, colliders, b):
                    cur_y = next_y
                    moved_y = True
                if can_move_to(next_x, cur_y, colliders, b):
                    cur_x = next_x
                    moved_x = True
                    
            if not moved_x and not moved_y:
                break
                
    return cur_x, cur_y

def navigate_waypoints(waypoints, colliders, b, speed=264, dt=0.033):
    px, py = waypoints[0]
    assert can_move_to(px, py, colliders, b), f"Initial position ({px}, {py}) is colliding!"
    
    for idx, (tx, ty) in enumerate(waypoints[1:], 1):
        assert can_move_to(tx, ty, colliders, b), f"Target waypoint ({tx}, {ty}) is colliding!"
        
        max_frames = 600
        reached = False
        
        for _ in range(max_frames):
            dist = math.hypot(tx - px, ty - py)
            if dist <= 5.0:
                px, py = tx, ty
                reached = True
                break
                
            dx = tx - px
            dy = ty - py
            dist_curr = math.hypot(dx, dy)
            eff_speed = min(speed, dist_curr / dt)
            vx = dx / dist_curr
            vy = dy / dist_curr
            
            new_px, new_py = move_player(px, py, vx, vy, eff_speed, dt, colliders, b)
            
            if math.hypot(new_px - px, new_py - py) < 0.001 and dist_curr > 5.0:
                new_dist = math.hypot(tx - new_px, ty - new_py)
                raise RuntimeError(f"Player stuck at ({new_px:.1f}, {new_py:.1f}) trying to reach ({tx}, {ty})! Dist: {new_dist:.1f}")
                
            px, py = new_px, new_py
            
        if not reached:
            raise RuntimeError(f"Timed out reaching waypoint {idx}: ({tx}, {ty}) from ({px:.1f}, {py:.1f})")

if __name__ == '__main__':
    print("Running waypoint navigation tests against NEW_COLLIDERS...")

    # 1. Foyer spawn to Living Room
    path_foyer_to_living = [(830, 860), (830, 710), (830, 680), (830, 640), (835, 600)]
    navigate_waypoints(path_foyer_to_living, NEW_COLLIDERS, bounds)
    print("  [OK] Path 1: Foyer -> Living Room passed.")

    # 2. Living Room to Bunker Hatch
    path_living_to_bunker = [(835, 600), (940, 600), (940, 300), (800, 300), (800, 240), (800, 205), (800, 180), (750, 175)]
    navigate_waypoints(path_living_to_bunker, NEW_COLLIDERS, bounds)
    print("  [OK] Path 2: Living Room -> Bunker Hatch passed.")

    # 3. Living Room to Master Bedroom
    path_living_to_master = [(835, 600), (600, 600), (535, 450), (535, 256), (430, 256), (300, 256), (290, 200)]
    navigate_waypoints(path_living_to_master, NEW_COLLIDERS, bounds)
    print("  [OK] Path 3: Living Room -> Master Bedroom passed.")

    # 4. Living Room to Kitchen & Dining
    path_living_to_kitchen = [(835, 600), (550, 500), (470, 480), (380, 480), (250, 420), (140, 420), (140, 560), (270, 560), (290, 650)]
    navigate_waypoints(path_living_to_kitchen, NEW_COLLIDERS, bounds)
    print("  [OK] Path 4: Living Room -> Kitchen & Dining passed.")

    # 5. Living Room to Bathroom
    path_living_to_bath = [(835, 600), (600, 600), (530, 650), (530, 745), (460, 745), (430, 740), (410, 610)]
    navigate_waypoints(path_living_to_bath, NEW_COLLIDERS, bounds)
    print("  [OK] Path 5: Living Room -> Bathroom passed.")

    # 6. Living Room to Child Bedroom
    path_living_to_child = [(835, 600), (960, 440), (1100, 320), (1100, 256), (1180, 256), (1300, 220), (1350, 170)]
    navigate_waypoints(path_living_to_child, NEW_COLLIDERS, bounds)
    print("  [OK] Path 6: Living Room -> Child Bedroom passed.")

    # 7. Living Room to Office / Studio (DIRECTLY from Living Room through West Door at x=1180, y=435)
    path_living_to_office = [(835, 600), (960, 560), (1130, 560), (1130, 435), (1220, 435), (1250, 600), (1380, 750), (1520, 520)]
    navigate_waypoints(path_living_to_office, NEW_COLLIDERS, bounds)
    print("  [OK] Path 7: Living Room -> Office / Studio passed.")

    # 8. Stress test: Diagonal Corner Clipping
    print("Running diagonal corner clipping stress tests...")
    corner_targets = [
        # Sofa outer corners
        (675, 335), (675, 580), (860, 580),
        # Kitchen Island corners
        (175, 448), (365, 448), (365, 533), (175, 533),
        # Office Desk corners
        (1290, 540), (1495, 565),
        # Bunker entrance wall corners
        (732, 205), (868, 205),
        # Doorway jamb corners
        (795, 680), (875, 680),
        (450, 230), (450, 282),
        (1155, 230), (1155, 285),
        (1180, 405), (1180, 465),
        (488, 715), (488, 775),
    ]

    for cx, cy in corner_targets:
        diagonals = [(-1, -1), (1, -1), (-1, 1), (1, 1)]
        for vx, vy in diagonals:
            start_x = cx - vx * 30
            start_y = cy - vy * 30
            if not can_move_to(start_x, start_y, NEW_COLLIDERS, bounds):
                continue
            px, py = start_x, start_y
            for _ in range(50):
                px, py = move_player(px, py, vx, vy, 350, 0.033, NEW_COLLIDERS, bounds)
                assert can_move_to(px, py, NEW_COLLIDERS, bounds), f"Clipping detected at ({px}, {py}) approaching corner ({cx}, {cy}) with dir ({vx}, {vy})!"

    print("  [OK] All diagonal corner clipping tests passed without a single penetration.")
    print("ALL TESTS PASSED SUCCESSFULLY!")
