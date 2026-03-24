# Gunicorn config for Render free tier
workers = 1
threads = 2
timeout = 120  # allow model load time
keepalive = 5
preload_app = True
bind = "0.0.0.0:10000"
