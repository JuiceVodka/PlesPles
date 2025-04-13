import Link from "next/link"

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-8">
      <header className="max-w-4xl mx-auto mb-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-pink-500 retro-font">About DDR Game</h1>
          <Link 
            href="/" 
            className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-bold retro-font transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-pink-400 mb-6 retro-font">What is Dance Dance Revolution?</h2>
          
          <p className="mb-6 text-gray-300 leading-relaxed">
            Dance Dance Revolution (DDR) is a rhythm game where players press arrow keys in sync with musical beats. 
            Originally an arcade game with a dance pad controller, our web version brings the same excitement to your browser using keyboard controls.
          </p>
          
          <h2 className="text-2xl font-bold text-pink-400 mb-6 retro-font">How to Play</h2>
          
          <div className="mb-6 text-gray-300 leading-relaxed">
            <p className="mb-4">The gameplay is simple:</p>
            <ol className="list-decimal list-inside space-y-2 pl-4">
              <li>Select a song from the songs page</li>
              <li>Watch arrow notes move up the screen toward the target zone</li>
              <li>Press the corresponding arrow key when the note reaches the target line</li>
              <li>Time your presses for better scores:
                <ul className="list-disc list-inside pl-6 mt-2">
                  <li><span className="text-yellow-300 font-bold">PERFECT</span>: 100 points</li>
                  <li><span className="text-green-400 font-bold">GREAT</span>: 50 points</li>
                  <li><span className="text-blue-400 font-bold">GOOD</span>: 10 points</li>
                  <li><span className="text-red-500 font-bold">MISS</span>: 0 points (breaks combo)</li>
                </ul>
              </li>
              <li>Build combo streaks for higher scores</li>
              <li>Master different note types including hold notes</li>
            </ol>
          </div>
          
          <h2 className="text-2xl font-bold text-pink-400 mb-6 retro-font">Technical Details</h2>
          
          <div className="mb-6 text-gray-300 leading-relaxed">
            <p className="mb-4">This game is built with:</p>
            <ul className="list-disc list-inside space-y-2 pl-4">
              <li>Next.js for the application framework</li>
              <li>Tailwind CSS for styling</li>
              <li>TypeScript for type-safe code</li>
              <li>Web Audio API for music playback</li>
              <li>JSON-based song patterns</li>
            </ul>
          </div>
          
          <div className="mt-12 text-center">
            <Link
              href="/songs"
              className="px-8 py-3 bg-pink-600 hover:bg-pink-700 text-white text-xl font-bold rounded-lg shadow-lg transition-colors inline-block retro-font"
            >
              Play Now
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
} 