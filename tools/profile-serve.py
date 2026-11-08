"""Static file server for tools/profile.ps1: like tests/serve.py, but it gzips text files for a client that accepts it,
as the game's real host does, so a throttled first load moves the bytes a player's phone would.

Usage: python tools/profile-serve.py PORT DIRECTORY [nopreload]

Cache-Control: no-store, so the only cache a second load can use is the service worker's (the warm load).
With `nopreload` the lines between index.html's `<!-- v91 preload -->` and `<!-- end v91 preload -->` are left out,
so one tree measures the first load with and without the module preload (ruling 1685).
"""
import functools
import gzip
import http.server
import os
import sys

TEXT = ('.html', '.js', '.css', '.json', '.webmanifest', '.svg', '.txt')


class Handler(http.server.SimpleHTTPRequestHandler):
    no_preload = False

    def log_message(self, *args):
        pass

    def do_GET(self):
        path = self.translate_path(self.path.split('?', 1)[0])
        if os.path.isdir(path):
            path = os.path.join(path, 'index.html')
        if not os.path.isfile(path):
            self.send_error(404)
            return
        with open(path, 'rb') as f:
            body = f.read()
        if self.no_preload and path.endswith('index.html'):
            text = body.decode('utf-8')
            a, b = text.find('<!-- v91 preload -->'), text.find('<!-- end v91 preload -->')
            if a >= 0 and b > a:
                text = text[:a] + text[b:]
            body = text.encode('utf-8')
        zipped = path.endswith(TEXT) and 'gzip' in (self.headers.get('Accept-Encoding') or '')
        if zipped:
            body = gzip.compress(body, 6)
        self.send_response(200)
        self.send_header('Content-Type', self.guess_type(path))
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        if zipped:
            self.send_header('Content-Encoding', 'gzip')
        self.end_headers()
        self.wfile.write(body)


class Server(http.server.ThreadingHTTPServer):
    allow_reuse_address = False
    request_queue_size = 512   # many modules asked at once: a short backlog can refuse one, and a page with a failed module never starts
    daemon_threads = True


if __name__ == '__main__':
    port, directory = int(sys.argv[1]), sys.argv[2]
    Handler.no_preload = len(sys.argv) > 3 and sys.argv[3] == 'nopreload'
    Server(('127.0.0.1', port), functools.partial(Handler, directory=directory)).serve_forever()
