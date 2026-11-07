import json
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def build_prompt(event, accepted_items, rejected_items, count=1):
    base = f"""
You are a helpful shopping assistant. A user is shopping for this event: {event}.

Recommend {count} essential item{"s" if count > 1 else ""}.
Do NOT include any of the following:
{json.dumps(rejected_items + accepted_items)}

Respond with ONLY valid JSON, enclosed in triple backticks, like this:
```json
[
  {{
    "item": "Item name",
    "reason": "Very short reason",
    "price": "$10-$20"
  }}
]
```
The 'reason' should be a very concise, 1-6 word explanation.
The 'price' should be a typical price range in USD, like "$10-$20"."""

    return base.strip()


def clean_item(raw_item):
    try:
        return {
            "item": raw_item["item"].strip(),
            "reason": raw_item.get("reason", "No description provided.").strip(),
            "price": str(raw_item.get("price") or "N/A").strip(),
        }
    except (KeyError, AttributeError):
        return None


def recommend_items(event, accepted, rejected, count=1):
    prompt = build_prompt(event, accepted, rejected, count)
    messages = [
        {"role": "system", "content": "You're a helpful shopping assistant."},
        {"role": "user", "content": prompt},
    ]

    response = client.chat.completions.create(
        model="gpt-6.1-terra",
        messages=messages,
        reasoning_effort="low",
    )
    raw = response.choices[0].message.content.strip()

    if "```" in raw:
        raw = raw.split("```")[1]
        raw = raw.replace("json", "").strip()

    data = json.loads(raw)
    if isinstance(data, dict):
        items = [data]
    elif isinstance(data, list):
        items = data
    else:
        raise ValueError("Unexpected GPT response format")

    seen = {name.strip().lower() for name in accepted + rejected}
    cleaned_items = []
    for raw_item in items:
        cleaned = clean_item(raw_item)
        if cleaned and cleaned["item"].lower() not in seen:
            cleaned_items.append(cleaned)

    return cleaned_items


def recommend_next_item(event, accepted, rejected):
    items = recommend_items(event, accepted, rejected, count=1)
    if not items:
        return {}

    return items[0]


def print_item(item):
    print(f"- {item['item']}: {item['reason']} ({item['price']})")


def shopping_list_run():
    accepted_items = []
    rejected_items = []

    event = input("What event are you shopping for? (e.g. back to school): ").strip()

    print("\n--- Recommended Items ---")
    new_items = recommend_items(
        event, [i["item"] for i in accepted_items], rejected_items, count=5
    )
    if not new_items:
        print("No recommendations received.")
        return

    for item in new_items:
        accepted_items.append(item)
        print_item(item)

    while True:
        more = input("\nGenerate another item? (y/n): ").strip().lower()
        if more != "y":
            break
        item = recommend_next_item(
            event, [i["item"] for i in accepted_items], rejected_items
        )
        if not item:
            print("No more items generated.")
            break
        accepted_items.append(item)
        print_item(item)

    print("\n--- Final Shopping List ---")
    for item in accepted_items:
        print_item(item)


if __name__ == "__main__":
    shopping_list_run()
