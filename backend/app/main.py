import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File
from shapely.geometry import Polygon
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Permitir que tu Next.js se conecte
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/segmentar")
async def segmentar_imagen(k: int = 5, file: UploadFile = File(...)):
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
                # Convertir a lista de puntos para JSON
                puntos = cnt.reshape(-1, 2).tolist()
                paths.append(puntos)
        
        resultado.append({
            "color": f"#{color[0]:02x}{color[1]:02x}{color[2]:02x}",
            "paths": paths
        })

    return {"capas": resultado}
