import asyncio
import websockets
import time

async def send_data(move):
    uri = "ws://localhost:9876/ws"  # Replace with your WebSocket server URI
    async with websockets.connect(uri) as websocket:
        data = {
            "move": move,
            "timestamp": time.time(),
        }
        await websocket.send(data)
        print(f"Sent data: {data}")

def main():
    moves = ["up", "down", "left"]  # Example moves
    for move in moves:
        asyncio.run(send_data(move))
        time.sleep(1)  # Optional: add delay between sends

if __name__ == "__main__":
    main()

