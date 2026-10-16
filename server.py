import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
PUBLIC_FILES = {
    "/": ("index.html", "text/html; charset=utf-8"),
    "/index.html": ("index.html", "text/html; charset=utf-8"),
    "/styles.css": ("styles.css", "text/css; charset=utf-8"),
    "/logo-data.js": ("logo-data.js", "text/javascript; charset=utf-8"),
    "/app.js": ("app.js", "text/javascript; charset=utf-8"),
    "/assets/real-estate-to-freedom-logo.jpg": ("assets/real-estate-to-freedom-logo.jpg", "image/jpeg"),
}


class AppHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        self._serve(send_body=True)

    def do_HEAD(self):
        self._serve(send_body=False)

    def _serve(self, send_body):
        path = urlsplit(self.path).path

        if path == "/health":
            payload = json.dumps({"status": "ok"}).encode("utf-8")
            self._respond(200, payload, "application/json; charset=utf-8", send_body, "no-store")
            return

        public_file = PUBLIC_FILES.get(path)
        if public_file is None:
            self._respond(404, b"Not found", "text/plain; charset=utf-8", send_body, "no-store")
            return

        file_name, content_type = public_file
        payload = (ROOT / file_name).read_bytes()
        cache_control = "no-cache" if file_name == "index.html" else "public, max-age=3600"
        self._respond(200, payload, content_type, send_body, cache_control)

    def _respond(self, status, payload, content_type, send_body, cache_control):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", cache_control)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "strict-origin-when-cross-origin")
        self.end_headers()
        if send_body:
            self.wfile.write(payload)


def main():
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("0.0.0.0", port), AppHandler)
    print(f"Project Overview listening on 0.0.0.0:{port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
