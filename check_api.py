import requests
import sys

try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

try:
    res = requests.get("http://localhost:3001/api/items", timeout=5)
    if res.status_code == 200:
        data = res.json()
        if data:
            first_item_id = data[0].get('id')
            detail_res = requests.get(f"http://localhost:3001/api/items/{first_item_id}", timeout=5)
            if detail_res.status_code == 200:
                detail_data = detail_res.json()
                print("Content field type:", type(detail_data.get('content')))
                print("Content field value:", repr(detail_data.get('content')))
except Exception as e:
    print("Error:", e)
