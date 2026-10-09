"""Static file server for Thebes that sends Cache-Control: no-store.

Usage: python tests/serve.py PORT DIRECTORY
"""
import functools
import http.server
import sys


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port, directory = int(sys.argv[1]), sys.argv[2]
    handler = functools.partial(Handler, directory=directory)
    http.server.ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()
