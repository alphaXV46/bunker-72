import math

# Player hitbox
PW = 20
PH = 14

def can_move_to(x, y, colliders, bounds):
    min_x = bounds['x']
    max_x = bounds['x'] + bounds['w']
    min_y = bounds['y']
    max_y = bounds['y'] + bounds['h']
    
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

def move_player(px, py, vx, vy, speed, dt, colliders, bounds):
    if vx != 0 and vy != 0:
        vx *= 0.70710678
        vy *= 0.70710678
        
    total_dist = math.hypot(vx * speed * dt, vy * speed * dt)
    max_step = 4.0 # max 4px per sub-step
    num_steps = max(1, int(math.ceil(total_dist / max_step)))
    
    step_x = (vx * speed * dt) / num_steps
    step_y = (vy * speed * dt) / num_steps
    
    cur_x = px
    cur_y = py
    
    for _ in range(num_steps):
        next_x = cur_x + step_x
        next_y = cur_y + step_y
        
        # Try full move first
        if can_move_to(next_x, next_y, colliders, bounds):
            cur_x = next_x
            cur_y = next_y
        else:
            # Diagonal sliding: prioritize the dominant axis or check both
            moved_x = False
            moved_y = False
            
            if abs(step_x) >= abs(step_y):
                if can_move_to(next_x, cur_y, colliders, bounds):
                    cur_x = next_x
                    moved_x = True
                if can_move_to(cur_x, next_y, colliders, bounds):
                    cur_y = next_y
                    moved_y = True
            else:
                if can_move_to(cur_x, next_y, colliders, bounds):
                    cur_y = next_y
                    moved_y = True
                if can_move_to(next_x, cur_y, colliders, bounds):
                    cur_x = next_x
                    moved_x = True
                    
            if not moved_x and not moved_y:
                # Completely blocked in both directions
                break
                
    return cur_x, cur_y

print("Movement simulation function defined.")
