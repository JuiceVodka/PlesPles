
from collections import deque
from typing import Any
import time
import pickle
import os
import pickle
import numpy as np
import matplotlib.pyplot as plt
from scipy.signal import butter, filtfilt
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
        # self.queue.append(reading)
        # if len(self.queue) > 400 and not self.done:
        #     self.done = True
        #     pickle.dump(self.queue, open("queue2.pkl", "wb"))
        #     print("Queue saved to queue2.pkl")
        x_vector, _, z_vector = map(float, reading.split())

        norm = np.sqrt(x_vector**2 + z_vector**2)


        if norm > 5:
            normalized_x = x_vector / norm
            normalized_z = z_vector / norm

            scalar_product_x = np.dot([1,0], [normalized_x, normalized_z])
            scalar_product_z = np.dot([0,1], [normalized_x, normalized_z])

            if scalar_product_x > 0.75:
                if self.backward:
                    self.backward = False
                    print("Forward")
                    send_data("forward")
                    self.clear_direction()
                else:
                    self.forward = True
            elif scalar_product_x < -0.75:
                if self.forward:
                    self.forward = False
                    print("Backward")
                    send_data("backward")
                    self.clear_direction()
                else:
                    self.backward = True
            elif scalar_product_z > 0.75:
                if self.right:
                    self.right = False
                    print("Right")
                    send_data("right")
                    self.clear_direction()
                else:
                    self.left = True
            elif scalar_product_z < -0.75:
                if self.left:
                    self.left = False
                    print("Left")
                    send_data("left")
                    self.clear_direction()
                else:
                    self.right = True

        self.step += 1

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