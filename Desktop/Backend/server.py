import asyncio
import websockets

# create handler for each connection
async def handler(websocket):
    data = await websocket.recv()
    reply = f"Data received as: {data}!"
    print(f"Received data: {data}")
    await websocket.send(reply)

async def main():
    async with websockets.serve(handler, "10.32.249.140", 9876):
        await asyncio.Future()  # Run forever

asyncio.run(main())