import sys
import os

# Adiciona a raiz do projeto ao path para importar main.py
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

from main import app
