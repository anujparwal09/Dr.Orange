#!/usr/bin/env python3
import sys
sys.path.insert(0, '../backend/venv/Scripts')

try:
    import tensorflow as tf
    print(f"TensorFlow version: {tf.__version__}")
except ImportError as e:
    print(f"TensorFlow import failed: {e}")

try:
    import pandas as pd
    print("Pandas ok")
except ImportError as e:
    print(f"Pandas import failed: {e}")

try:
    import numpy as np
    print("NumPy ok")
except ImportError as e:
    print(f"NumPy import failed: {e}")

try:
    import PIL
    print("PIL ok")
except ImportError as e:
    print(f"PIL import failed: {e}")

print("Python executable:", sys.executable)