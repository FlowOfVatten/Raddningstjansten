#!/usr/bin/env python3
import json
import sqlite3
from http.server import BaseHTTPRequestHandler, HTTPServer

DB_PATH = '/srv/ha/config/home-assistant_v2.db'
ENTITY_ID = 'sensor.f730_cu_3x400v_hot_water_top_bt7'
HOST = '0.0.0.0'
PORT = 8766


def read_bt7_state():
    con = sqlite3.connect(DB_PATH)
    cur = con.cursor()
    cur.execute(
        """
        SELECT s.state, s.last_updated_ts
        FROM states s
        JOIN states_meta m ON m.metadata_id = s.metadata_id
        WHERE m.entity_id = ?
        ORDER BY s.state_id DESC
        LIMIT 1
        """,
        (ENTITY_ID,),
    )
    row = cur.fetchone()
    con.close()
    if not row:
        return None, None
    state_raw, updated_ts = row
    try:
        temp_c = float(state_raw)
    except (TypeError, ValueError):
        return None, updated_ts
    return temp_c, updated_ts


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path not in ('/bt7', '/bt7/'):
            self.send_response(404)
            self.end_headers()
            return

        temp_c, updated_ts = read_bt7_state()
        payload = {
            'entity_id': ENTITY_ID,
            'temp_c': temp_c,
            'updated_ts': updated_ts,
        }
        data = json.dumps(payload).encode('utf-8')
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *_args):
        return


if __name__ == '__main__':
    server = HTTPServer((HOST, PORT), Handler)
    server.serve_forever()
