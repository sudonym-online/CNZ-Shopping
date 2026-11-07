import re
import requests
import os
from dotenv import load_dotenv

load_dotenv()

def search_serp_products(query):
    url = "https://serpapi.com/search.json"
    params = {
        "q": query,
        "engine": "google_shopping",
        "api_key": os.getenv("SERPAPI_KEY")
    }
    try:
        response = requests.get(url, params=params, timeout=10)
    except requests.exceptions.RequestException as e:
        raise RuntimeError(f"SerpAPI request failed: {type(e).__name__}") from None
    if response.status_code != 200:
        raise RuntimeError(f"SerpAPI request failed: {response.status_code}") from None
    return response.json()

def _words(text):
    return re.findall(r"[a-z0-9]+", (text or "").lower())


def get_serp_product(name):
    items = (search_serp_products(name).get("shopping_results") or [])[:5]
    short = " ".join(name.split()[:4])
    if not items and short != name:
        items = (search_serp_products(short).get("shopping_results") or [])[:5]
    if not items:
        return None
    want = list(dict.fromkeys(_words(name)))
    item = max(items, key=lambda i: len(set(want) & set(_words(i.get("title")))))
    have = set(_words(item.get("title")))
    missing = [w for w in want if w not in have]
    return {
        "match": round(1 - len(missing) / len(want), 2) if want else 0,
        "missing": missing,
        "title": item.get("title"),
        "image": item.get("thumbnail"),
        "price": item.get("price"),
        "rating": item.get("rating"),
        "reviews": item.get("reviews"),
        "link": item.get("product_link") or item.get("link"),
    }
