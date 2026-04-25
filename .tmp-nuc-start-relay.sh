#!/usr/bin/env bash
set -e
pkill -f /home/jarvis/bt7_relay.py || true
nohup python3 /home/jarvis/bt7_relay.py >/home/jarvis/bt7_relay.log 2>&1 </dev/null &
sleep 1
ss -ltn | grep 8766 || true
ls -l /home/jarvis/bt7_relay.log || true
python3 - <<'PY'
import urllib.request
print(urllib.request.urlopen('http://127.0.0.1:8766/bt7', timeout=5).read().decode())
PY
