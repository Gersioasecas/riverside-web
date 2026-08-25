#!/usr/bin/env python3
"""Servidor local del sitio. Concurrente a propósito: el http.server de un
solo hilo se atasca sirviendo las ocho fotos a la vez y el navegador nunca
termina de cargar."""
import functools, os, sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'codigo-puro')
PUERTO = int(sys.argv[1]) if len(sys.argv) > 1 else 4173

class Silencioso(SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

h = functools.partial(Silencioso, directory=os.path.abspath(RAIZ))
srv = ThreadingHTTPServer(('127.0.0.1', PUERTO), h)
srv.daemon_threads = True
print(f'sirviendo {os.path.abspath(RAIZ)} en http://localhost:{PUERTO}', flush=True)
srv.serve_forever()
