import os
from flask import Flask, jsonify, request, render_template
from dotenv import load_dotenv

load_dotenv()

from Compare import get_comparison
from chatbot import ai_bot_response
from shopping_list import recommend_next_item
from apis.serp_api import get_serp_product


app = Flask(__name__, static_folder="public/static")


def _body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else {}


def _str_list(value, max_items, max_len=200):
    return (
        isinstance(value, list)
        and len(value) <= max_items
        and all(isinstance(s, str) and len(s) <= max_len for s in value)
    )


def _valid_history(history):
    return (
        isinstance(history, list)
        and len(history) <= 60
        and all(
            isinstance(m, dict)
            and m.get("role") in ("user", "assistant")
            and isinstance(m.get("content"), str)
            and len(m["content"]) <= 8000
            for m in history
        )
    )


@app.route("/")
def home():
    return render_template("chatbot.html")


@app.route("/compare", methods=["GET"])
def compare_page():
    return render_template("compare.html")


@app.route("/compare-items", methods=["POST"])
def compare_items():
    items = _body().get("items")
    if not (_str_list(items, 5) and len(items) >= 2 and all(i.strip() for i in items)):
        return jsonify({"error": "Enter 2 to 5 product names."}), 400

    try:
        return jsonify(get_comparison([i.strip() for i in items]))
    except Exception:
        app.logger.exception("compare-items failed")
        return jsonify({"error": "The comparison failed. Try again."}), 502


@app.route("/get_response", methods=["POST"])
def get_response():
    data = _body()
    user_input = data.get("user_input")
    history = data.get("history", [])
    if not isinstance(user_input, str) or not user_input.strip() or len(user_input) > 4000:
        return jsonify({"error": "Enter a message of 1 to 4000 characters."}), 400
    if not _valid_history(history):
        return jsonify({"error": "The conversation history is not valid. Start over."}), 400

    history = [{"role": m["role"], "content": m["content"]} for m in history]
    try:
        return jsonify({"response": ai_bot_response(user_input, history)})
    except Exception:
        app.logger.exception("get_response failed")
        return jsonify({"error": "The assistant did not answer. Try again."}), 502


@app.route("/shopping-list", methods=["GET"])
def shopping_list_page():
    return render_template("shopping_list.html")


@app.route("/get_shopping_list_item", methods=["POST"])
def get_shopping_list_item():
    data = _body()
    event = data.get("event")
    accepted = data.get("accepted", [])
    rejected = data.get("rejected", [])
    if not (
        isinstance(event, str)
        and event.strip()
        and len(event) <= 200
        and _str_list(accepted, 100)
        and _str_list(rejected, 100)
    ):
        return jsonify({"error": "Enter an event of 1 to 200 characters. A list can have at most 100 items."}), 400

    try:
        return jsonify(recommend_next_item(event.strip(), accepted, rejected))
    except Exception:
        app.logger.exception("get_shopping_list_item failed")
        return jsonify({"error": "No item was generated. Try again."}), 502


@app.route("/get_product")
def get_product():
    name = request.args.get("name", "").strip()
    if not name or len(name) > 200:
        return jsonify({"error": "Missing or too long name parameter."}), 400

    try:
        product = get_serp_product(name)
    except Exception:
        app.logger.exception("get_product failed")
        return jsonify({"error": "The product search failed."}), 502
    if not product:
        return jsonify({}), 404
    return jsonify(product)


if __name__ == "__main__":
    if not os.getenv("OPENAI_API_KEY"):
        print("Error: OPENAI_API_KEY not found. Please set it in .env.")
    else:
        app.run(host="127.0.0.1", port=int(os.getenv("PORT", "5899")), debug=True)
