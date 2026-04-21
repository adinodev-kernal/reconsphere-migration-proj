import urllib.request
import json
try:
    req = urllib.request.Request('http://localhost:3000/api/chat', data=b'{"prompt":"test", "context":{}}', headers={'Content-Type': 'application/json'})
    print(urllib.request.urlopen(req).read().decode('utf-8'))
except Exception as e:
    print("Error:", e)
