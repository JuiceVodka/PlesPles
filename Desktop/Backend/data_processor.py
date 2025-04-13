
from collections import deque
from typing import Any
import time
import pickle
import os
import pickle
import numpy as np
import websockets
import asyncio

class DataProcessor:
    def __init__(self):
        self.queue = []
        self.done = False
        self.step = 0
        self.last_step = 0
        self.calibrating_vectors = []
        self.calibrated = False
        self.calibrating = False
        self.previous_vector = None

        self.forward = False
        self.backward = False
        self.left = False
        self.right = False

    def add_reading(self, reading):
        x_vector, _, z_vector = map(float, reading.split())

        norm = np.sqrt(x_vector**2 + z_vector**2)


        if norm > 3.5:
            normalized_x = x_vector / norm
            normalized_z = z_vector / norm

            scalar_product_x = np.dot([1,0], [normalized_x, normalized_z])
            scalar_product_z = np.dot([0,1], [normalized_x, normalized_z])

            if scalar_product_x > 0.75:
                if self.backward:
                    self.backward = False
                    self.clear_direction()
                    return "up"
                else:
                    self.forward = True
            elif scalar_product_x < -0.75:
                if self.forward:
                    self.forward = False
                    self.clear_direction()
                    return "down"
                else:
                    self.backward = True
            elif scalar_product_z > 0.75:
                if self.right:
                    self.right = False
                    self.clear_direction()
                    return "right"
                else:
                    self.left = True
            elif scalar_product_z < -0.75:
                if self.left:
                    self.left = False
                    self.clear_direction()
                    return "left"
                else:
                    self.right = True

        self.step += 1
        return None

        

    def clear_direction(self):
        self.forward = False
        self.backward = False
        self.left = False
        self.right = False



async def send_data(move):
    uri = "ws://localhost:9876/ws"  # Replace with your WebSocket server URI
    async with websockets.connect(uri) as websocket:
        data = {
            "move": move,
            "timestamp": time.time(),
        }
        websocket.send(data)
        print(f"Sent data: {data}")