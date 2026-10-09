"""Static file server for Thebes that sends Cache-Control: no-store.

Usage: python tests/serve.py PORT DIRECTORY [RESULTS_FILE]

The test page reports its results by POSTing the text to /__results. With a RESULTS_FILE the server
writes it there (by writing a temporary file and renaming it, so a reader never sees half a file).
Without one the POST is accepted and dropped, so the page still works under a plain `serve.py 8000 .`.
"""
import functools
import http.server
import os
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    results_file = None

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        if self.path.split('?')[0] != '/__results':
            self.send_error(404)
            return
        length = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(length)  # UTF-8 text, written through as bytes
        if self.results_file:
            tmp = self.results_file + '.tmp'
            with open(tmp, 'wb') as f:
                f.write(body)
            os.replace(tmp, self.results_file)
        self.send_response(204)
        self.end_headers()


class Server(http.server.ThreadingHTTPServer):
    # http.server sets SO_REUSEADDR, which on Windows lets a new server bind a port that a
    # previous run's dying server still holds. With it off, a port clash fails to bind instead.
    allow_reuse_address = False
    # The default backlog of 5 can refuse connections when the browser opens many module requests at once.
    request_queue_size = 64


if __name__ == '__main__':
    port, directory = int(sys.argv[1]), sys.argv[2]
    Handler.results_file = sys.argv[3] if len(sys.argv) > 3 else None
    handler = functools.partial(Handler, directory=directory)
    Server(('127.0.0.1', port), handler).serve_forever()
