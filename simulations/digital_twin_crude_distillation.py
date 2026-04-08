# digital_twin_crude_distillation.py
import numpy as np
import matplotlib.pyplot as plt
from time import sleep

def simulate_furnace(steps=100):
    temp = 310.0
    velocity = 0.0
    ttc = 5.0
    history = []

    for i in range(steps):
        # Simulate disturbance (human/pipe vibration)
        velocity = np.random.normal(0.4, 0.3)
        ttc = max(0.5, ttc - 0.1 + np.random.normal(0, 0.2))

        sigma = 0.1 + 0.55 * velocity
        if ttc < 2.0 or sigma > 1.5:
            new_temp = temp  # freeze
            status = "BLOCKED"
        else:
            new_temp = np.clip(temp + np.random.normal(3, 1), 200, 380)
            status = "APPROVED"

        temp = new_temp
        history.append((temp, sigma, ttc, status))
        print(f"Step {i:2d} | Temp={temp:.1f}°C | Σ={sigma:.2f} | TTC={ttc:.1f}s | {status}")

        sleep(0.1)
    return history

if __name__ == "__main__":
    # Run it
    simulate_furnace()
