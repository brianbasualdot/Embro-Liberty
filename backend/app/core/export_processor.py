import pyembroidery
from typing import List, Dict, Any
import io
import numpy as np
from shapely.geometry import Polygon, LineString, MultiLineString
from app.core.stitch_engine import StitchEngine

def create_embroidery_file(layers: List[Dict[str, Any]], format: str = "dst") -> bytes:
    """
    Convert a list of layers (with path coordinates) into a stitch file using CAD/CAM logic.
    """
    pattern = pyembroidery.EmbPattern()
    
    # Scale factor: Fabric.js usually 1px = 1 unit.
    # Standard embroidery density is often defined in mm.
    # Assuming 1 px = 0.264 mm (96 DPI) or user defined.
    # For simplicity, we treat input coordinates as 1/10 mm units (standard embroidery unit).
    # If input is pixels, we need a conversion factor. Let's assume input is 10x scaled (pixels).
    SCALE_FACTOR = 1.0 
    
    for layer in layers:
        pattern.color_change()
        
        # Get Stitch Settings (defaults if missing)
        settings = layer.get('settings', {})
        density = settings.get('density', 4.0) # units (lines spacing)
        angle = settings.get('angle', 45.0)
        stitch_length = settings.get('stitchLength', 3.5)
        pull_comp = settings.get('pullCompensation', 0.0)
        use_underlay = settings.get('underlay', True)
        
        raw_paths = layer.get('paths', [])
        
        for path in raw_paths:
            if not path or len(path) < 3:
                continue
                
            # Create Shapely Polygon from path
            # Ensure path is closed
            if path[0] != path[-1]:
                path.append(path[0])
                
            poly = Polygon(path)
            if not poly.is_valid:
                poly = poly.buffer(0)
            
            # 1. Pull Compensation
            compensated_poly = StitchEngine.apply_pull_compensation(poly, pull_comp)
            
            # 2. Underlay Generation (if enabled)
            if use_underlay:
                # Center Walk (Stabilizer)
                # center_walk = StitchEngine.generate_center_walk(compensated_poly)
                # for p in center_walk:
                #     pattern.add_stitch_absolute(pyembroidery.STITCH, int(p[0]), int(p[1]))
                
                # Edge Walk (Contour)
                edge_walk = StitchEngine.generate_edge_walk(compensated_poly, offset_mm=2.0) # 2 units offset
                if edge_walk:
                    pattern.jump(int(edge_walk[0][0]), int(edge_walk[0][1]))
                    for p in edge_walk:
                        pattern.add_stitch_absolute(pyembroidery.STITCH, int(p[0]), int(p[1]))
            
            # 3. Fill / Stitch Generation based on Style
            style = settings.get('style', 'tatami').lower()
            stroke_only = layer.get('isStroke', False) # Frontend can flag if it's just a line
            
            stitches = []
            
            if stroke_only or style == 'bean':
                # Treat as line contour
                if style == 'bean':
                   # Convert polygon boundary to bean stitch
                   boundary = compensated_poly.boundary
                   if isinstance(boundary, LineString):
                       stitches = StitchEngine.generate_bean_stitch(boundary)
                   elif isinstance(boundary, MultiLineString):
                       for geom in boundary.geoms:
                           stitches.extend(StitchEngine.generate_bean_stitch(geom))
                else:
                    # Simple running stitch (Edge Walk essentially)
                    stitches = StitchEngine.generate_edge_walk(compensated_poly, offset_mm=0)
            
            elif style == 'satin':
                stitches = StitchEngine.generate_satin_column(compensated_poly, density=density)
                
            else: # Default Tatami
                offset = settings.get('offset', 0.5) # Default brick pattern
                stitches = StitchEngine.generate_tatami_fill(
                    compensated_poly, 
                    density=density, 
                    angle_deg=angle, 
                    stitch_length=stitch_length,
                    offset=offset
                )
            
            if stitches:
                # Expert Rule: Tie-In / Tie-Out
                stitches = StitchEngine.add_tie_stitches(stitches)
                
                # Expert Rule: Auto-Trim / Connector Logic
                if pattern.stitches:
                    last_x = pattern.stitches[-1][0]
                    last_y = pattern.stitches[-1][1]
                    curr_x = stitches[0][0]
                    curr_y = stitches[0][1]
                    
                    dist = np.sqrt((curr_x - last_x)**2 + (curr_y - last_y)**2)
                    
                    # 20 units = 2.0 mm (assuming 1 unit = 0.1mm) 
                    # If inputs are formatted correctly. 
                    # Earlier we said 1px = 1 unit. 
                    if dist < 20: # Short jump -> Running Stitch connection
                        # Interpolate simple line
                        steps = int(dist / 2.0) # 2.0mm stitch length
                        if steps > 0:
                            for t in np.linspace(0, 1, steps + 1)[1:]:
                                ix = last_x + (curr_x - last_x) * t
                                iy = last_y + (curr_y - last_y) * t
                                pattern.add_stitch_absolute(pyembroidery.STITCH, int(ix), int(iy))
                    else: # Long jump -> Trim
                         pattern.trim()
                         pattern.jump(int(curr_x), int(curr_y))
                else:
                    pattern.jump(int(stitches[0][0]), int(stitches[0][1]))

                for p in stitches:
                    pattern.add_stitch_absolute(pyembroidery.STITCH, int(p[0]), int(p[1]))

    # Expert Rule: Thread Consumption Calculation
    # Calculate length of all STITCH commands (ignore JUMP/TRIM for thread usage, mostly)
    total_length_mm = 0
    if pattern.stitches:
        arr = np.array([s[:2] for s in pattern.stitches if s[2] == pyembroidery.STITCH])
        if len(arr) > 1:
            diffs = np.diff(arr, axis=0)
            dists = np.sqrt(np.sum(diffs**2, axis=1))
            total_length_units = np.sum(dists)
            # Assuming 1 unit = 0.1 mm
            total_length_mm = total_length_units * 0.1

    top_thread_m = (total_length_mm * 1.05) / 1000.0 # +5% slack
    bobbin_thread_m = (total_length_mm * 0.70) / 1000.0 # ~70% of top

    # Write to buffer
    stream = io.BytesIO()
    
    if format.lower() == 'dst':
        pyembroidery.write_dst(pattern, stream)
    elif format.lower() == 'pes':
        pyembroidery.write_pes(pattern, stream)
    elif format.lower() == 'jef':
        pyembroidery.write_jef(pattern, stream)
    else:
        raise ValueError(f"Unsupported format: {format}")
        
    # Return both bytes and stats (Handling this by appending stats to a new format or handled by caller)
    # Since this function signature returns 'bytes', we can't easily return stats without breaking contract.
    # Hack: If caller expects JSON, handle it there. 
    # For now, we print it for verification or could smuggle it if needed.
    # Ideally, returns object { content: bytes, meta: dict }
    # Let's keep returning bytes but log execution.
    print(f"Stats: Top={top_thread_m:.2f}m, Bobbin={bobbin_thread_m:.2f}m")
    
    return stream.getvalue()

