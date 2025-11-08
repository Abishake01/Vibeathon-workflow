import requests
from requests.adapters import HTTPAdapter
from urllib3.util import Retry

# ---- Walrus Testnet endpoints (from docs) ----
PUBLISHER_URL = "https://publisher.walrus-testnet.walrus.space/v1/blobs"
AGGREGATOR_URL = "https://aggregator.walrus-testnet.walrus.space/v1/blobs"

# Optional: robust retries + timeouts
session = requests.Session()
session.headers.update({"User-Agent": "walrus-example/1.0"})
retries = Retry(
    total=3,
    backoff_factor=0.5,
    status_forcelist=(429, 500, 502, 503, 504),
    allowed_methods=frozenset(["GET", "PUT"]),
)
session.mount("https://", HTTPAdapter(max_retries=retries))
TIMEOUT = (5, 30)  # (connect, read) seconds

def upload_file(file_path: str) -> str:
    """Upload a file to Walrus (publisher) and return the blobId."""
    with open(file_path, "rb") as f:
        resp = session.put(
            PUBLISHER_URL,
            data=f,
            headers={"Content-Type": "application/octet-stream"},
            timeout=TIMEOUT,
        )
    resp.raise_for_status()
    data = resp.json()
    # Response can be either "newlyCreated" or "alreadyCertified"
    if "newlyCreated" in data:
        blob_id = data["newlyCreated"]["blobObject"]["blobId"]
    elif "alreadyCertified" in data:
        blob_id = data["alreadyCertified"]["blobId"]
    else:
        # Fallback for older/alternate implementations
        blob_id = data.get("blobId") or data.get("id")
    print(f"✅ Uploaded. blobId = {blob_id}")
    return blob_id

def retrieve_file(blob_id: str, output_path: str):
    """Download a blob from Walrus (aggregator) by blobId."""
    url = f"{AGGREGATOR_URL}/{blob_id}"
    resp = session.get(url, timeout=TIMEOUT)
    resp.raise_for_status()
    with open(output_path, "wb") as f:
        f.write(resp.content)
    print(f"✅ Retrieved to {output_path}")

if __name__ == "__main__":
    # 1) Make sure the file exists (e.g., echo Hello > hello.txt)
    blob = upload_file("hello.txt")
    # 2) Fetch it back
    retrieve_file(blob, "retrieved_hello.txt")
