# v1.2 - Force reload for passenger backend with the latest updates
import os
import sys

# 1. Project path
sys.path.insert(0, os.path.dirname(__file__))

from a2wsgi import ASGIMiddleware
from app.main import app

# Bridge ASGI to WSGI
application = ASGIMiddleware(app)
