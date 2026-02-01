import numpy as np
import shapely
from shapely.geometry import Polygon, LineString, MultiLineString, Point
from shapely.affinity import rotate, translate
from typing import List, Tuple, Optional

class StitchEngine:
    """
    CAM module for processing vector shapes into embroidery stitch data.
    """

    @staticmethod
    def apply_pull_compensation(polygon: Polygon, compensation_mm: float) -> Polygon:
        """
        Expands the polygon to compensate for thread tension.
        Simple implementation: Uniform buffer.
        Advanced: Directional buffer could be implemented by scaling along normals.
        """
        if compensation_mm == 0:
            return polygon
        return polygon.buffer(compensation_mm, join_style=shapely.geometry.JOIN_STYLE.round)

    @staticmethod
    def generate_center_walk(polygon: Polygon, stitch_length: float = 2.0) -> List[Tuple[float, float]]:
        """
        Generates a center-line run stitch for underlay.
        Uses approximation by creating a negative buffer and finding the centroid, or simple interpolation.
        For complex shapes, medial axis transform is ideal, but costly.
        Simplified approach: Return a path connecting centroids of subsections or just the centroid for small shapes.
        """
        # Very simplified center walk: Just a few points inside
        try:
             center = polygon.centroid
             # Create a small path crossing the center
             minx, miny, maxx, maxy = polygon.bounds
             start = (center.x - (maxx-minx)/4, center.y)
             end = (center.x + (maxx-minx)/4, center.y)
             
             line = LineString([start, end])
             restricted_line = line.intersection(polygon)
             
             if restricted_line.is_empty:
                 return [(center.x, center.y)]
             
             if isinstance(restricted_line, LineString):
                 return list(restricted_line.coords)
             return []
        except:
            return []

    @staticmethod
    def generate_edge_walk(polygon: Polygon, offset_mm: float = 0.5, stitch_length: float = 2.0) -> List[Tuple[float, float]]:
        """
        Generates a running stitch along the inside edge of the shape.
        """
        inset_poly = polygon.buffer(-offset_mm)
        if inset_poly.is_empty:
            return []
        
        # If multipolygon (e.g. hole created), take exterior of largest
        if isinstance(inset_poly, shapely.geometry.MultiPolygon):
            inset_poly = max(inset_poly.geoms, key=lambda a: a.area)
            
        boundary = inset_poly.exterior
        # Discretize
        length = boundary.length
        num_points = int(length / stitch_length)
        if num_points < 3:
             return list(boundary.coords)
             
        points = [boundary.interpolate(distance).coords[0] for distance in np.linspace(0, length, num_points)]
        return points

    @staticmethod
    def generate_tatami_fill(
        polygon: Polygon, 
        density: float = 0.4, # Spacing between rows
        angle_deg: float = 45.0,
        stitch_length: float = 3.5,
        offset: float = 0.0 # 0.0 to 1.0, shifts pattern
    ) -> List[Tuple[float, float]]:
        """
        Generates a Tatami (Fill) stitch pattern with offset support to avoid moiré.
        """
        # 1. Rotate
        rotated_poly = rotate(polygon, -angle_deg, origin=(0,0))
        minx, miny, maxx, maxy = rotated_poly.bounds
        
        # 2. Generate Scanlines
        y_lines = np.arange(miny, maxy, density)
        stitches = []
        
        direction = 1 # 1: Left to Right, -1: Right to Left
        
        for i, y in enumerate(y_lines):
            # Create horizontal line
            line = LineString([(minx - 1, y), (maxx + 1, y)])
            intersection = rotated_poly.intersection(line)
            
            if intersection.is_empty:
                continue
                
            segments = []
            if isinstance(intersection, LineString):
                segments = [intersection]
            elif isinstance(intersection, MultiLineString):
                segments = list(intersection.geoms)
            
            # Sort segments
            segments.sort(key=lambda s: s.coords[0][0])
            
            row_points = []
            
            # Apply offset based on row index (e.g., 0.3 offset per row)
            # A pattern like 0, 0.5, 0, 0.5 is standard brick
            # Or continuous random offset
            # Here we use the user param 'offset' (0..1) as a shift ratio of stitch_length
            row_shift = (i * offset * stitch_length) % stitch_length
            
            for seg in segments:
                coords = list(seg.coords)
                start_x, start_y = coords[0]
                end_x, end_y = coords[-1]
                
                # Interpolate points
                dist = np.sqrt((end_x - start_x)**2)
                
                # Calculate start point with offset
                # We start 'row_shift' into the line, then step by 'stitch_length'
                current_x = start_x + row_shift
                while current_x > start_x: 
                     current_x -= stitch_length # Verify we start at beginning or before
                if current_x < start_x:
                     current_x += stitch_length
                     
                x_points = []
                x_points.append(start_x) # Always hit edge
                
                while current_x < end_x:
                    if current_x > start_x: # Don't duplicate start if match
                        x_points.append(current_x)
                    current_x += stitch_length
                
                x_points.append(end_x) # Always hit edge
                
                for x in x_points:
                    row_points.append((x, start_y))
            
            if direction == -1:
                row_points.reverse()
                
            stitches.extend(row_points)
            direction *= -1
            
        # 5. Rotate back
        final_stitches = []
        for x, y in stitches:
            p = Point(x, y)
            p_rot = rotate(p, angle_deg, origin=(0,0))
            final_stitches.append((p_rot.x, p_rot.y))
            
        return final_stitches

    @staticmethod
    def generate_satin_column(
        polygon: Polygon,
        density: float = 0.4, # Used as zig-zag spacing
    ) -> List[Tuple[float, float]]:
        """
        Generates a Satin Stitch (ZigZag) for a columnar polygon.
        Simplified approach:
        1. Find Oriented Bounding Box (OBB).
        2. Determine long axis.
        3. Zig-Zag along the long axis perpendicular to it.
        """
        # Get OBB (Minimum Rotated Rectangle)
        obb = polygon.minimum_rotated_rectangle
        
        # Get coordinates of OBB
        x, y = obb.exterior.coords.xy
        points = list(zip(x, y))[:4] # First 4 points
        
        # Calculate edge lengths to find orientation
        d01 = Point(points[0]).distance(Point(points[1]))
        d12 = Point(points[1]).distance(Point(points[2]))
        
        # Decide rotation angle to align long axis with X
        angle = 0
        if d01 > d12:
            # Side 0-1 is longer. Calculate angle of 0-1
            dx = points[1][0] - points[0][0]
            dy = points[1][1] - points[0][1]
            angle = np.degrees(np.arctan2(dy, dx))
        else:
             # Side 1-2 is longer
            dx = points[2][0] - points[1][0]
            dy = points[2][1] - points[1][1]
            angle = np.degrees(np.arctan2(dy, dx))
            
        # Rotate polygon to horizontal
        rotated_poly = rotate(polygon, -angle, origin=(0,0))
        minx, miny, maxx, maxy = rotated_poly.bounds
        
        # Generate rungs along X
        x_steps = np.arange(minx, maxx, density)
        stitches = []
        toggle = True 
        
        for x in x_steps:
             line = LineString([(x, miny - 10), (x, maxy + 10)])
             inter = rotated_poly.intersection(line)
             
             if inter.is_empty: continue
             
             # Take the longest segment if multiple intersect
             target_seg = inter
             if isinstance(inter, MultiLineString):
                  target_seg = max(inter.geoms, key=lambda g: g.length)
             
                 if hasattr(target_seg, 'coords'):
                     coords = list(target_seg.coords)
                     # Sort by Y
                     coords.sort(key=lambda c: c[1])
                     p_min = np.array(coords[0])
                     p_max = np.array(coords[-1])
                     
                     # Short Stitch Logic (Simplified)
                     # In a full run, we would compare with PREVIOUS rung to detect curvature.
                     # Here we simply alternate if the segment is 'too short'? No, that's not it.
                     # We need to detect if one side is pinched. 
                     # For this stateless loop, it's hard. 
                     # IMPROVEMENT: Let's assume standard zig-zag for now, 
                     # but if we had previous points we could detect d(p_min_prev, p_min) vs d(p_max_prev, p_max).
                     
                     # Let's add a random factor or 'short' factor if requested (simulated density control)
                     # For now, standard zig-zag.
                     
                     if toggle:
                         stitches.append(tuple(p_min))
                         stitches.append(tuple(p_max))
                     else:
                         stitches.append(tuple(p_max))
                         stitches.append(tuple(p_min))
                     toggle = not toggle

        # Rotate stitches back
        final = []
        for sx, sy in stitches:
             p = rotate(Point(sx, sy), angle, origin=(0,0))
             final.append((p.x, p.y))
             
        # Expert Rule: Short Stitches for Sharp Curves
        # Not fully implemented in simplified logic above, but structure allows it.
        # Improvement: In the loop, check distance between p_min and p_max.
        # If density is high on one side compared to previous rung, shorten.
        
        return final

    @staticmethod
    def add_tie_stitches(points: List[Tuple[float, float]], length: float = 0.5) -> List[Tuple[float, float]]:
        """
        Adds micro-stitches (Tie-In / Tie-Out) to lock the thread.
        Pattern: Small back-and-forth motion.
        """
        if len(points) < 2: return points
        
        # Tie-In (Start)
        start = np.array(points[0])
        second = np.array(points[1])
        vec = second - start
        norm = np.linalg.norm(vec)
        if norm > 0:
            direction = vec / norm
            # Create 3 micro stitches
            p1 = tuple(start + direction * length)
            p2 = tuple(start)
            p3 = tuple(start + direction * length)
            points.insert(1, p3)
            points.insert(1, p2)
            points.insert(1, p1)
            
        # Tie-Out (End)
        end = np.array(points[-1])
        prev = np.array(points[-2])
        vec_end = end - prev
        norm_end = np.linalg.norm(vec_end)
        if norm_end > 0:
            direction_end = vec_end / norm_end
            p1 = tuple(end - direction_end * length)
            p2 = tuple(end)
            p3 = tuple(end - direction_end * length)
            points.append(p1)
            points.append(p2)
            points.append(p3)
            
        return points

    @staticmethod
    def generate_bean_stitch(
        linestring: LineString, 
        stitch_length: float = 2.5
    ) -> List[Tuple[float, float]]:
        """
        Generates a Bean Stitch (Triple Run): A -> B -> A -> C -> B -> D ...
        Basically for every step forward, goes back and forward again.
        Simplified pattern: Forward P1->P2, Back P2->P1, Forward P1->P2, Forward P2->P3...
        Result: 3 layers of thread.
        """
        length = linestring.length
        if length == 0: return []
        
        num_points = max(2, int(length / stitch_length))
        interpolated = [linestring.interpolate(d).coords[0] for d in np.linspace(0, length, num_points)]
        
        final_stitches = []
        for i in range(len(interpolated) - 1):
            curr = interpolated[i]
            next_p = interpolated[i+1]
            
            # A -> B
            final_stitches.append(curr)
            final_stitches.append(next_p)
            # B -> A
            final_stitches.append(curr)
            # A -> B (Standard bean is 3 passes per segment)
            final_stitches.append(next_p)
            
        return final_stitches

