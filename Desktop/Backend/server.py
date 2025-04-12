# import asyncio
# import websockets

# # create handler for each connection
# async def handler(websocket):
#     data = await websocket.recv()
#     reply = f"Data received as: {data}!"
#     print(f"Received data: {data}")
#     await websocket.send(reply)

# async def main():
#     async with websockets.serve(handler, "10.32.249.140", 9876):
#         await asyncio.Future()  # Run forever

# asyncio.run(main())


from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import json

app = FastAPI()

# Serve static files (audio/stepcharts)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Helper: Parse .sm file into JSON
def parse_sm_file(sm_path: Path):
    with open(sm_path, 'r', encoding='utf-8') as f:
        data = f.read()
    # ... (Implement your parser here, extract BPM, steps, etc.)
    return {
        "id": sm_path.parent.name,
        "title": "10年桜",  # Extracted from #TITLE
        "bpm": 173.4,      # Extracted from #BPMS
        "steps": "..."      # Parsed step data
    }

# API: List all songs
@app.get("/api/songs")
def list_songs():
    songs_dir = Path("static/songs")
    songs = []
    for song_dir in songs_dir.iterdir():
        if song_dir.is_dir():
            songs.append({
                "id": song_dir.name,
                "title": "10年桜",  # Replace with parsed .sm title
                "banner": f"/static/songs/{song_dir.name}/banner.png"
            })
    return songs

# API: Get a specific song (by ID)
@app.get("/api/songs/{song_id}")
def get_song(song_id: str):
    song_dir = Path(f"static/songs/{song_id}")
    if not song_dir.exists():
        raise HTTPException(status_code=404, detail="Song not found")
    
    return {
        "audio": f"/static/songs/{song_id}/audio.ogg",
        "steps": parse_sm_file(song_dir / "steps.sm")
    }