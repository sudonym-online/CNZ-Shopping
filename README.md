# CNZ Shopping

A Flask web app that uses AI to help people choose products: a guided chatbot, a side-by-side comparison tool, and an event shopping list.

**Demo video:** [paste link]

[Screenshot or GIF: paste here]

Built in the Code2College AI program (June to December 2025) by Nicholas, Cedric, and Zed, with contributions from cesar-val1908. It won the Audience Choice award at Code2College's AI Demo Day 2025.

**My part:** I built the front end for all three pages (`static/*.js`, `templates/`, `static/styles/`), the chatbot's backend and function calling (`chatbot.py`), and most of the Flask routes in `main.py`. Cedric wrote the comparison prompts and `Compare.py`. Zed built the shopping list backend (`shopping_list.py`) and the SerpAPI helpers.

## What it does

- **Chatbot** (`/`): asks one question at a time to learn what you need. It uses multiple-choice buttons, a slider (for example, for budget), or a text box. GPT-4o picks each question through function calling. When it has enough details, it shows product cards. Each card has an image from SerpAPI and a link to a Google Shopping search.
- **Compare** (`/compare`): you enter two or more product names. The browser asks Perplexity Sonar (through Puter.js) for each item's price, specs, pros, and cons, all at the same time. The server then has GPT-4o build a comparison table that marks each spec as good, bad, or neutral, with a "best overall" and a "best affordable" pick.
- **Shopping list** (`/shopping-list`): you name an event, such as "back to school". GPT-4o suggests items one at a time. You accept or reject each one, and it doesn't suggest the same item again.

Product information comes from AI models, so prices and specs can be out of date or wrong.

## Tech stack

- Python and Flask
- OpenAI API (GPT-4o)
- SerpAPI (product images)
- Puter.js with Perplexity Sonar (product data for comparisons)
- HTML, CSS, and JavaScript
- Waitress or Gunicorn, Docker

## Run it locally

You need Python 3.10 or later, an OpenAI API key, and a SerpAPI key.

1. Create and activate a virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate
   ```

2. Create a file named `.env` in the project folder:

   ```bash
   OPENAI_API_KEY="your-api-key-here"
   SERPAPI_KEY="your-api-key-here"
   PORT=5899
   ```

3. Start the server. The script installs the dependencies first:

   ```bash
   ./scripts/run.sh
   ```

4. Open `http://localhost:5899`.

To use Docker instead, create the same `.env` file and run `docker compose up --build`.

## What I learned

- **Getting structured output from a language model.** Plain text answers were hard to turn into buttons and sliders. Function calling lets GPT-4o pick a question type and fill in its fields, and the front end draws the matching control.
- **Models don't always follow the format.** Sometimes the model writes the function call as plain text instead. `chatbot.py` has a fallback that reads that text and converts it to the expected format. If that also fails, it shows the model's text as an open question with a note to try again.
- **Working on a team in Git.** We merged our work through pull requests on a shared repo, with the front end and the backend changing at the same time.

## What I would improve next

- Add automated tests for the Flask routes and the response parsing.
- Show where each price comes from, since prices from an AI model can be out of date.
- Remove code that the app doesn't use (the review summary and sentiment helpers in `apis/`).
