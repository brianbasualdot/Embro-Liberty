import numpy as np
from shapely.geometry import LineString, Point, Polygon
from typing import List, Tuple, Dict, Any

# --- HELPERS ---

def distance(p1, p2):
    return np.sqrt((p1[0]-p2[0])**2 + (p1[1]-p2[1])**2)

def add_lock_stitches(stitches: List[List[float]], type: str = 'both') -> List[List[float]]:
    """
    Adds a 'Micro-Triangle' safety knot (3 stitches, 0.5mm).
    Prevents thread unraveling at start/end.
    """
    if not stitches or len(stitches) < 2:
        return stitches

    result = list(stitches)
    
    # Tie-In (Start)
    if type in ['in', 'both']:
        start = np.array(result[0])
        # Calculate a small perpendicular offset for the triangle
        p2 = np.array(result[1])
        vec = p2 - start
        norm_val = np.linalg.norm(vec)
        
        if norm_val > 0:
            direction = vec / norm_val
            perp = np.array([-direction[1], direction[0]])
            
            # Triangle points relative to start
            # 1. Forward 0.5mm
            # 2. Sideways 0.5mm
            # 3. Back to start
            
            t1 = start + (direction * 0.5)
            t2 = start + (perp * 0.5)
            
            # Sequence: Start -> T1 -> T2 -> Start -> Continue
            lock_seq = [
                t1.tolist(),
                t2.tolist(),
                start.tolist()
            ]
            result = lock_seq + result

    # Tie-Out (End)
    if type in ['out', 'both']:
        end = np.array(result[-1])
        prev = np.array(result[-2])
        vec = end - prev
        norm_val = np.linalg.norm(vec)
        
        if norm_val > 0:
            direction = vec / norm_val
            perp = np.array([-direction[1], direction[0]])
            
            t1 = end - (direction * 0.5) # Backwards
            t2 = end + (perp * 0.5)
            
            lock_seq = [
                t1.tolist(),
                t2.tolist(),
                end.tolist()
            ]
            result = result + lock_seq
            
    return result

# --- CORE ALGORITHMS ---

def generate_satin_column_industrial(
    path_points: List[List[float]], 
    width: float = 4.0, 
    density: float = 0.4,
    short_stitches: bool = True
) -> List[List[float]]:
    """
    Generates satin column with Short Stitches logic.
    If angle < 45 deg, alternate stitches are shortened to avoid bunching.
    """
    if len(path_points) < 2: return []

    line = LineString(path_points)
    length = line.length
    num_steps = int(length / density)
    
    stitches = []
    
    prev_normal = None
    
    for i in range(num_steps + 1):
        dist = i * density
        if dist > length: dist = length
        
        point = line.interpolate(dist)
        
        # Calculate Tangent & Normal
        p1 = line.interpolate(max(0, dist - 0.1))
        p2 = line.interpolate(min(length, dist + 0.1))
        dx, dy = p2.x - p1.x, p2.y - p1.y
        norm_len = np.sqrt(dx*dx + dy*dy)
        
        if norm_len == 0: 
            ux, uy = 0, 0
        else:
            ux, uy = -dy/norm_len, dx/norm_len # Normal vector
            
        current_normal = np.array([ux, uy])
        
        # Short Stitch Logic
        is_sharp_turn = False
        if prev_normal is not None and short_stitches:
            dot = np.clip(np.dot(prev_normal, current_normal), -1.0, 1.0)
            angle = np.degrees(np.arccos(dot))
            
            if angle > 45: # High change in normal vector = Sharp Curve
                is_sharp_turn = True
                
        prev_normal = current_normal
        
        # Determine Width Factor
        # If sharp turn AND it's an 'even' stitch (alternate), reduce width
        # to 70% to alleviate congestion.
        width_factor = 1.0
        if is_sharp_turn and (i % 2 != 0):
             width_factor = 0.70 # Retract to 70% from center?
             # Actually, simpler industrial logic: Shorten from one side.
             # We shorten symmetrically for simplicity here, or just reduce total width.
        
        half_w = (width * width_factor) / 2.0
        
        # Zig (Right)
        p_right = [point.x + ux * half_w, point.y + uy * half_w]
        # Zag (Left)
        p_left = [point.x - ux * half_w, point.y - uy * half_w]
        
        if i % 2 == 0:
            stitches.append(p_right)
        else:
            stitches.append(p_left)

    return add_lock_stitches(stitches)


def generate_tatami_fill(
    polygon_points: List[List[float]], 
    density_start: float = 0.4,
    density_end: float = 0.4,
    angle: float = 0
) -> List[List[float]]:
    """
    Generates Tatami (Fill) with linear density gradient.
    """
    if len(polygon_points) < 3: return []
    
    try:
        poly = Polygon(polygon_points)
    except:
        return []
        
    if not poly.is_valid or poly.is_empty:
        return []

    minx, miny, maxx, maxy = poly.bounds
    height = maxy - miny
    
    stitches = []
    
    # Iterate Y with variable step
    y = miny
    step_count = 0
    
    # Safety loop limit
    max_loops = 10000 
    loop_i = 0
    
    while y <= maxy and loop_i < max_loops:
        loop_i += 1
        
        # LINEAR INTERPOLATION of Density
        progress = (y - miny) / height if height > 0 else 0
        current_density = density_start + (density_end - density_start) * progress
        current_density = max(0.2, current_density) # Minimum safe clamp
        
        scanline = LineString([(minx - 10, y), (maxx + 10, y)])
        intersection = poly.intersection(scanline)
        
        lines = []
        if intersection.is_empty: pass
        elif intersection.geom_type == 'LineString': lines.append(intersection)
        elif intersection.geom_type == 'MultiLineString': lines.extend(intersection.geoms)
            
        for line_seg in lines:
            coords = list(line_seg.coords)
            if not coords: continue
            
            start, end = coords[0], coords[-1]
            
            seg_len = distance(start, end)
            n_pts = int(seg_len / current_density) # Use density for stitch length too? 
            # Usually stitch length is fixed (e.g. 3mm) for fills, density is row spacing.
            # But user prompt implies density variation. Let's assume row spacing varies (done by y +=)
            # and stitch length is constant-ish.
            stitch_len = 3.5
            n_pts_line = int(seg_len / stitch_len)
            
            line_pts = []
            dx_Seg = (end[0] - start[0])
            dy_Seg = (end[1] - start[1])
            
            for k in range(n_pts_line + 1):
                t = k / n_pts_line if n_pts_line > 0 else 0
                px = start[0] + dx_Seg * t
                py = start[1] + dy_Seg * t
                line_pts.append([px, py])
                
            if step_count % 2 == 1:
                line_pts.reverse()
                
            stitches.extend(line_pts)
            
        y += current_density
        step_count += 1
        
    return add_lock_stitches(stitches)

def optimize_branching(layers: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Smart Branching: reorders same-color objects.
    If dist < 5mm, inserts hidden Running Stitch connector to avoid Trim.
    """
    grouped = {}
    for layer in layers:
        c = layer['color']
        if c not in grouped: grouped[c] = []
        grouped[c].append(layer)
        
    optimized_layers = []
    
    for color, group in grouped.items():
        if not group: continue
        
        ordered = [group[0]]
        remaining = group[1:]
        current_obj = group[0]
        
        while remaining:
            # Find closest Next Object
            # Need end point of current
            curr_paths = current_obj.get('paths', [])
            if not curr_paths: start_pt = [0,0]
            else: start_pt = curr_paths[-1][-1] # Last point
            
            best_idx = -1
            min_dist = float('inf')
            
            for idx, cand in enumerate(remaining):
                cand_paths = cand.get('paths', [])
                cand_start = cand_paths[0][0] if cand_paths else [0,0]
                d = distance(start_pt, cand_start)
                if d < min_dist:
                    min_dist = d
                    best_idx = idx
            
            if best_idx != -1:
                next_obj = remaining.pop(best_idx)
                
                # Check 5mm threshold (assuming Coordinates in mm or close? 
                # Fabric.js on frontend was 3 units = 1mm visual. 
                # Backend receives screen coords usually?
                # If 1 unit = 1 px, and we assume 96dpi, 5mm is approx 18px.
                # Let's use a generic threshold 20.0 for now.
                
                next_paths = next_obj.get('paths', [])
                next_start = next_paths[0][0] if next_paths else [0,0]
                
                dist_val = distance(start_pt, next_start)
                
                # Threshold: 5mm. 
                # If coordinates are "pixels" (often ~3-4px per mm), 5mm ~ 15-20px.
                # If coordinates are 10ths of mm (DST), 5mm = 50 units.
                # We'll assume 20 units threshold.
                if dist_val < 50.0: 
                    # Insert Running Stitch Connector
                    # Generate straight line points
                    num_steps = int(dist_val / 3.0) + 1 # 3mm stitch len
                     
                    connector_path = []
                    vx = (next_start[0] - start_pt[0])
                    vy = (next_start[1] - start_pt[1])
                    
                    for s in range(1, num_steps + 1):
                        frac = s / (num_steps + 1)
                        connector_path.append([
                            start_pt[0] + vx * frac,
                            start_pt[1] + vy * frac
                        ])
                    
                    # Prepend connector to next_obj's paths
                    if next_paths:
                        # Add as a separate path segment at the start
                        next_obj['paths'].insert(0, connector_path)
                    
                ordered.append(next_obj)
                current_obj = next_obj
            else:
                break
                
        optimized_layers.extend(ordered)
        
    return optimized_layers


def generate_applique_steps(polygon: List[List[float]]) -> List[Dict[str, Any]]:
    """
    Generates 3-step Applique:
    1. Position (Run Stitch) - marks fabric placement
    2. Tackdown (Run Stitch) - holds fabric
    3. Finish (Satin Column around edge)
    """
    # 1. Position
    position_step = {
        "name": "Appliqué Position",
        "type": "run",
        "color": "#e0e0e0",
        "paths": [polygon]
    }
    
    # 2. Tackdown (slightly inset or same? usually same for raw edge, or inset for cut)
    # Using same path for simplicity
    tackdown_step = {
        "name": "Appliqué Tackdown",
        "type": "run",
        "color": "#cccccc", 
        "paths": [polygon]
    }
    
    # 3. Finish (Satin)
    # We need to close the loop for the satin generator
    closed_poly = list(polygon)
    if len(closed_poly) > 0 and closed_poly[0] != closed_poly[-1]:
         closed_poly.append(closed_poly[0])
         
    # Generate wider satin for coverage
    satin_stitches = generate_satin_column_industrial(closed_poly, width=3.5, density=0.4)
    
    finish_step = {
        "name": "Appliqué Satin Finish",
        "type": "satin", 
        "color": "#000000",
        "paths": [satin_stitches] 
    }
    
    return [position_step, tackdown_step, finish_step]

