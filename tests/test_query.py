import urllib.request
import urllib.error
import json

url = 'http://127.0.0.1:8000/api/query'
data = {
    "query": "What is the main topic of the papers?",
    "top_k": 5
}
headers = {
    'Content-Type': 'application/json'
}

req = urllib.request.Request(
    url,
    data=json.dumps(data).encode('utf-8'),
    headers=headers,
    method='POST'
)

print(f"Sending query request to {url}...")
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        print('STATUS:', r.status)
        print('BODY:', r.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('HTTP ERROR:', e.code, e.reason)
    print('RESPONSE BODY:', e.read().decode('utf-8'))
except urllib.error.URLError as e:
    print('URL ERROR:', e.reason)
except Exception as e:
    print('GENERAL ERROR:', type(e), e)
