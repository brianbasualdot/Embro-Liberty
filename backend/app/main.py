from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import endpoints

app = FastAPI(title="Embro-liberty Backend", version="0.1.0")

# Configure CORS
origins = [
    "http://localhost:3000",  # Next.js frontend
    "*" # Allow all for development
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(endpoints.router)

@app.get("/")
def read_root():
    return {"message": "Embro-liberty Backend is running"}
