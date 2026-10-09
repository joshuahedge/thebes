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


class Server(http.server.ThreadingHTTPServer):
    # http.server sets SO_REUSEADDR, which on Windows lets a new server bind a port that a
    # previous run's dying server still holds. With it off, a port clash fails to bind instead.
    allow_reuse_address = False


if __name__ == '__main__':
    port, directory = int(sys.argv[1]), sys.argv[2]
    handler = functools.partial(Handler, directory=directory)
    Server(('127.0.0.1', port), handler).serve_forever()
