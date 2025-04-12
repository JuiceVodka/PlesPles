import { config } from './config';

export interface SongMetadata {
  id: number
  title: string
  artist: string
  difficulty: number
  image_path: string
  json_path: string
  bpm?: number
  audio?: string
  coverImage?: string
}

// API base URL from config
const API_BASE_URL = config.api.baseUrl;

// Fetch all songs from the API
export async function getAllSongs(): Promise<SongMetadata[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/songs`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
      credentials: 'include',
      mode: 'cors',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch songs: ${response.status}`);
    }
    
    const songs = await response.json();
    
    // Transform data to add coverImage for frontend components
    return songs.map((song: SongMetadata) => ({
      ...song,
      // Create a frontend-friendly coverImage path
      coverImage: `${API_BASE_URL}/${song.image_path}`
    }));
  } catch (error) {
    console.error("Error fetching songs:", error);
    return [];
  }
}

// Fetch a single song by ID
export async function getSongById(id: string | number): Promise<SongMetadata | null> {
  try {
    // Convert string ID to number if needed
    const songId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    // First get the song metadata
    const songs = await getAllSongs();
    const song = songs.find(s => s.id === songId);
    
    if (!song) {
      return null;
    }
    
    return song;
  } catch (error) {
    console.error(`Failed to load song with ID ${id}:`, error);
    return null;
  }
}

// Fetch song data (steps and metadata) from the API
export async function getSongData(id: string | number): Promise<any> {
  try {
    // Convert string ID to number if needed
    const songId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    const response = await fetch(`${API_BASE_URL}/songs/${songId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      mode: 'cors',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch song data: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Failed to load song data for ${id}:`, error);
    return null;
  }
} 