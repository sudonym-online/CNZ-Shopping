import json
from pathlib import Path

from openai import OpenAI

client = OpenAI()

PROMPT = (Path(__file__).parent / "prompts" / "compare2.txt").read_text(encoding="utf-8")


# ---- SCHEMA ----
def _obj(**props):
    return {
        "type": "object",
        "properties": props,
        "required": list(props),
        "additionalProperties": False,
    }


_STR = {"type": "string"}

SCHEMA = _obj(
    table={
        "type": "array",
        "items": _obj(
            item=_STR,
            price=_STR,
            pros=_STR,
            cons=_STR,
            specs={
                "type": "array",
                "items": _obj(
                    groupName=_STR,
                    stats={
                        "type": "array",
                        "items": _obj(
                            name=_STR,
                            value=_STR,
                            indicator=_STR,
                            status={"type": "string", "enum": ["good", "bad", "neutral"]},
                        ),
                    },
                ),
            },
        ),
    },
    distinctions=_STR,
    recommend=_STR,
)


# ---- COMPARE ----
def get_comparison(items: list[str]) -> dict:
    resp = client.responses.create(
        model="gpt-6.1-terra",
        reasoning={"effort": "low"},
        tools=[{"type": "web_search", "search_context_size": "low"}],
        input=[
            {"role": "system", "content": PROMPT},
            {"role": "user", "content": "Compare these products: " + json.dumps(items)},
        ],
        text={"format": {"type": "json_schema", "name": "comparison", "strict": True, "schema": SCHEMA}},
    )
    return json.loads(resp.output_text)
