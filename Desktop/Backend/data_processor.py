
from collections import deque
from typing import Any
import pickle
import os

class DataProcessor:
    def __init__(self):
        self.queue = []
        

    def add_reading(self, reading: Any) -> None:
        """Add a new reading to the queue."""
        self.queue.append(reading)
        # Limit the size of the queue to the last 100 readings
        if len(self.queue) > 1000:
            self.queue.pop(0)
            print("Queue filled")
            pickle.dump(self.queue, open("queue.pkl", "wb"))

        
        # step = self.check_readings()

    def check_readings(self):
        # Process queue to detect a spike in acceleration
        if len(self.queue) < 20:
            return False
        
        # Check the last 20 readings for a spike
        recent_readings = self.queue[-20:]
        # Sum absolute of all three axes
        recent_readings = [sum(abs(reading)) for reading in recent_readings]
        avg = sum(recent_readings) / len(recent_readings)
        threshold = avg * 3
        spike_detected = any(reading > threshold for reading in recent_readings)
        return spike_detected