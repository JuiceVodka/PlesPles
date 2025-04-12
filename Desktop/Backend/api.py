from flask import Flask, jsonify
import os
import json
from flask_cors import CORS
from flask import send_from_directory


app = Flask(__name__)
CORS(
    app,
    resources={
        r"/api/*": {
            "origins": "http://localhost:3000",  # Replace with your frontend URL
            "supports_credentials": True  # <-- This allows credentials
        }
    }
)
# Configure paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SONGS_DIR = os.path.join(BASE_DIR, 'songs')

songs = [
    {
        "id": 1,
        "title": "10nen sakura",
        "artist": "10nen sakura",
        "difficulty": 2,
        "image_path": os.path.join("songs", "10nen-sakura-jacket.png"),  
        "json_path": os.path.join("songs", "sakura.json")  
    },
    {
        "id": 2,
        "title": "FLASHDANCE (WHAT A FEELING)",
        "artist": "MAGIKA",
        "difficulty": 1,
        "image_path": os.path.join("songs", "FLASHDANCE-(WHAT-A-FEELING)-jacket.png"),  
        "json_path": os.path.join("songs", "flashdance.json")  
    },
    {
        "id": 3,
        "title": "U Can't Touch This",
        "artist": "MC Hammer",
        "difficulty": 1,
        "image_path": os.path.join("songs", "U-Can't-Touch-This-jacket.png"),  
        "json_path": os.path.join("songs", "cant-touch.json")  
    }
    
]

@app.route('/api/songs/<path:filename>')
def serve_song_file(filename):
    return send_from_directory(os.path.join(os.path.dirname(__file__), "songs"), filename)
                               
@app.route('/api/songs')
def get_songs():
    return jsonify(songs)

@app.route('/api/songs/<int:song_id>', methods=['GET'])
def get_song(song_id):
    # Find the song in our database
    song = next((s for s in songs if s['id'] == song_id), None)
    
    if not song:
        return jsonify({"error": "Song not found"}), 404
    
    try:
        # Build the full file path
        json_path = os.path.join(os.path.dirname(__file__), song['json_path'])
        
        # Load and parse the JSON file
        with open(json_path, 'r', encoding='utf-8') as f:
            song_data = json.load(f)
            
        # Return the song data as JSON
        return jsonify({
            "metadata": song_data["metadata"],
            "steps": song_data["steps"]
        })
        
    except FileNotFoundError:
        return jsonify({"error": "Song data file not found"}), 404
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid song data format"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)