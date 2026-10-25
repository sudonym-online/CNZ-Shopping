# CNZ Shopping

A Flask web app that uses AI to help people choose products: a guided chatbot, a side-by-side comparison tool, and an event shopping list.

**Live demo:** [paste link] · **Demo video:** [paste link]

[Screenshot or GIF: paste here]

This is a team project by Cedric Hernandez, Nicholas Mathew, Zed Bradley, and cesar-val1908 (GitHub username).
**My part:** [describe the features you built]

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

[Write this part in your own words.]

## What I would improve next

[Write this part in your own words.]
