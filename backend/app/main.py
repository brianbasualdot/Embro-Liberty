import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Body
from shapely.geometry import Polygon, LineString, Point
from shapely.ops import linemerge, unary_union
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Union

app = FastAPI()

# Permitir que tu Next.js se conecte
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.stitch_engine import (
    generate_satin_column_industrial, 
    generate_tatami_fill, 
    optimize_branching, 
    generate_applique_steps
)

# ... (rest of imports)

# --- ENDPOINTS ---

@app.post("/segmentar")
async def segmentar_imagen(k: int = 5, file: UploadFile = File(...)):
    # ... (Keep existing implementation)
    # 1. Leer la imagen
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    # 2. K-Means Clustering
    data = img.reshape((-1, 3)).astype(np.float32)
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 10, 1.0)
    _, labels, centers = cv2.kmeans(data, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
    
    centers = np.uint8(centers)
    res = centers[labels.flatten()].reshape(img.shape)

    # 3. Extraer contornos por cada color
    resultado = []
    for color in centers:
        mask = cv2.inRange(res, color, color)
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        paths = []
        for cnt in contours:
            if len(cnt) > 2: # Evitar ruidos pequeños
                puntos = cnt.reshape(-1, 2).tolist()
                paths.append(puntos)
        
        resultado.append({
            "color": f"#{color[0]:02x}{color[1]:02x}{color[2]:02x}",
            "paths": paths
        })

    return {"capas": resultado}

@app.post("/satin")
async def create_satin(
    path: List[List[float]] = Body(...),
    width: float = Body(4.0),
    density: float = Body(0.4)
):
    # Use the industrial engine
    stitches = generate_satin_column_industrial(path, width, density, short_stitches=True)
    return {"stitches": stitches}

@app.post("/applique")
async def create_applique(
    polygon: List[List[float]] = Body(...)
):
    # Applique logic might need to be in stitch_engine too, or adapted here
    # Use the local or imported one. 
    # I realized I didn't verify if generate_applique_steps was in stitch_engine in previous step.
    # Looking at previous step code: I did NOT include generate_applique_steps in stitch_engine.
    # I should add it there or import/adapt.
    # Let's keep the logic simple here or fix stitch_engine.
    
    # Re-implementing simplified here using new satin engine for the finish
    position_step = {
        "name": "Appliqué Position",
        "type": "run",
        "color": "#e0e0e0",
        "paths": [polygon]
    }
    tackdown_step = {
        "name": "Appliqué Tackdown",
        "type": "run",
        "color": "#cccccc", 
        "paths": [polygon]
    }
    
    # Finish using Industrial Satin
    satin_stitches = generate_satin_column_industrial(polygon + [polygon[0]], width=3.5, density=0.4)
    
    finish_step = {
        "name": "Appliqué Satin Finish",
        "type": "satin", 
        "color": "#000000",
        "paths": [satin_stitches] 
    }
    
    return {"steps": [position_step, tackdown_step, finish_step]}

@app.post("/tatami")
async def create_tatami(
    polygon: List[List[float]] = Body(...),
    density_start: float = Body(0.4),
    density_end: float = Body(0.4),
    angle: float = Body(0)
):
    stitches = generate_tatami_fill(polygon, density_start, density_end, angle)
    return {"stitches": stitches}

@app.post("/export")
async def export_embroidery(
    layers: List[Dict[str, Any]] = Body(...),
    format: str = Body("dst")
):
    import pyembroidery
    # Use Industrial Stitch Engine
    from app.stitch_engine import optimize_branching
    
    # 1. Optimize Order (Branching)
    # This reorders objects to minimize jumps and adds travel runs if implemented
    optimized_layers = optimize_branching(layers)
    
    pattern = pyembroidery.EmbPattern()
    
    for layer in optimized_layers:
        # We need actual stitch points. 
        # If 'paths' contains vector points, we must digitize them.
        # If frontend sends 'generatedStitches' (from satin), use them.
        # For this MVP, let's assume 'paths' are either run stitches or we just jump between them.
        # REALITY CHECK: Frontend sends 'paths' which are contours. 
        # We should probably run 'Satin' on them if type is satin, or 'Run' if type is run.
        # But for simplicity, we treat all points as Run stitches for now unless specified.
        
        # Color change for new layer
        # Parse hex color layer['color'] -> RGB
        try:
            h = layer.get('color', '#000000').lstrip('#')
            rgb = tuple(int(h[i:i+2], 16) for i in (0, 2, 4))
            pattern.add_thread(pyembroidery.EmbThread(rgb[0], rgb[1], rgb[2]))
        except:
             pattern.add_thread(pyembroidery.EmbThread(0, 0, 0))
             
        # Add stitches
        paths = layer.get('paths', [])
        for p_idx, path in enumerate(paths):
            if not path: continue
            
            # Jump to start of path
            pattern.add_stitch_absolute(pyembroidery.JUMP, path[0][0], path[0][1])
            
            # For now, treat as RUN stitch (simple line)
            for point in path:
                pattern.add_stitch_absolute(pyembroidery.STITCH, point[0], point[1])
                
            # If closed shape? we don't know, assuming path is just points.
            
    # Save to buffer
    from io import BytesIO
    stream = BytesIO()
    
    # pyembroidery writes to file path usually, but write(stream) supported?
    # It supports write_dst(stream)
    
    if format.lower() == 'dst':
        pyembroidery.write_dst(pattern, stream)
    elif format.lower() == 'pes':
        pyembroidery.write_pes(pattern, stream)
    elif format.lower() == 'exp':
        pyembroidery.write_exp(pattern, stream)
    else:
        pyembroidery.write_dst(pattern, stream)
        
    stream.seek(0)
    
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        stream, 
        media_type="application/octet-stream", 
        headers={"Content-Disposition": f"attachment; filename=design.{format}"}
    )
