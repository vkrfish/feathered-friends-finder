import requests
import urllib.parse

id_val = "1279ea49-c35d-49b2-a826-227aec0e11a1"
file_name = "PAPER DISTRIBUTION CIRCULAR (II,III & IV).pdf"

# Replicate the exact encodeURIComponent behavior on the filename
full_name = f"{id_val}_{file_name}"
encoded_name = urllib.parse.quote(full_name)

url = f"http://localhost:3001/uploads/{encoded_name}"
print("Fetching URL:", url)

try:
    res = requests.head(url, timeout=5)
    print("Response Status Code:", res.status_code)
    print("Response Headers:", res.headers)
except Exception as e:
    print("Fetch error:", e)
