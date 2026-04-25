import urllib.request
print(urllib.request.urlopen('http://127.0.0.1:8766/bt7', timeout=5).read().decode())
