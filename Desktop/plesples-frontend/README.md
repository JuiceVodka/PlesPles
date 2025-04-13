# DDR Game

PlesPles, a Dance Dance Revolution (DDR) style game built with Next.js and Tailwind CSS.

## Features

- Rhythm game with arrow key controls
- Beat-sync'd note patterns from JSON files
- Score tracking with combo system
- Different note types: regular taps and hold notes
- Visual feedback for hit quality (Perfect, Great, Good, Miss)

## How to Play

1. Use arrow keys to hit the notes as they reach the top target line
2. Build combos for higher scores
3. Score system:
   - Perfect: 100 points
   - Great: 50 points
   - Good: 10 points
   - Miss: 0 points and combo reset

## Song File Format

Song patterns are defined in JSON files with the following structure:

```json
{
  "metadata": {
    "title": "Song Title",
    "bpm": 120,
    "audio": "song-file.ogg",
    "offset": 0,
    "bpms": [[0, 120]]
  },
  "steps": [
    { "beat": 0, "arrows": [1, 0, 0, 0] }, // Left arrow tap
    { "beat": 1, "arrows": [0, 1, 0, 0] }, // Down arrow tap
    { "beat": 2, "arrows": [0, 0, 1, 0] }, // Up arrow tap
    { "beat": 3, "arrows": [0, 0, 0, 1] }  // Right arrow tap
  ]
}
```

Arrow values:
- 0: No arrow
- 1: Tap note
- 2: Hold note head (start)
- 3: Hold note tail (end)

## Setup

1. Clone this repository
2. Install dependencies:
```
npm install
```
3. Run the development server:
```
npm run dev
```
4. Open http://localhost:3000 in your browser

## Adding Your Own Songs

1. Create a JSON file in the `public/songs` directory following the format above
2. Add your audio file (OGG format recommended) to the same directory
3. Update the game code to load your song 