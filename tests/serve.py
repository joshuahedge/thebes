"""Static file server for Thebes that sends Cache-Control: no-store.

Usage: python tests/serve.py PORT DIRECTORY [RESULTS_FILE] [HOST]

The test page reports its results by POSTing the text to /__results. With a RESULTS_FILE the server
writes it there (by writing a temporary file and renaming it, so a reader never sees half a file).
Without one the POST is accepted and dropped, so the page still works under a plain `serve.py 8000 .`.
HOST defaults to 127.0.0.1; pass 0.0.0.0 to reach the server from a phone on the LAN.

POST /__file?name=NAME (base64 body) writes the decoded bytes to NAME under DIRECTORY. tools/assets.html uses it
to save the rendered icons. Only the six names in ALLOWED_FILES are accepted (403 for anything else).
"""
import base64
import functools
import http.server
import os
import sys
import urllib.parse

ALLOWED_FILES = {
    'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-512-maskable.png',
    'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'og-image.png',
}


class Handler(http.server.SimpleHTTPRequestHandler):
    results_file = None

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        path, _, query = self.path.partition('?')
        length = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(length)
        if path == '/__results':
            if self.results_file:
                tmp = self.results_file + '.tmp'
                with open(tmp, 'wb') as f:
                    f.write(body)  # UTF-8 text, written through as bytes
                os.replace(tmp, self.results_file)
            self.send_response(204)
            self.end_headers()
            return
        if path == '/__file':
            # tools/assets.html writes the rendered icons here. Only the six known names, only under the served dir.
            name = urllib.parse.parse_qs(query).get('name', [''])[0]
            if name not in ALLOWED_FILES:
                self.send_error(403)
                return
            target = os.path.join(self.directory, *name.split('/'))
            os.makedirs(os.path.dirname(target), exist_ok=True)
            tmp = target + '.tmp'
            with open(tmp, 'wb') as f:
                f.write(base64.b64decode(body))
            os.replace(tmp, target)
            self.send_response(204)
            self.end_headers()
            return
        self.send_error(404)


class Server(http.server.ThreadingHTTPServer):
    # http.server sets SO_REUSEADDR, which on Windows lets a new server bind a port that a
    # previous run's dying server still holds. With it off, a port clash fails to bind instead.
    allow_reuse_address = False
    # The default backlog of 5 can refuse connections when the browser opens many module requests at once.
    request_queue_size = 64


if __name__ == '__main__':
    port, directory = int(sys.argv[1]), sys.argv[2]
    Handler.results_file = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else None
    host = sys.argv[4] if len(sys.argv) > 4 else '127.0.0.1'   # 0.0.0.0 to reach it from a phone on the LAN
    handler = functools.partial(Handler, directory=directory)
    Server((host, port), handler).serve_forever()
