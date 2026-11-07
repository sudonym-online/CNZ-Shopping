import os
import json
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

with open(
    os.path.join(os.path.dirname(__file__), "prompts", "chatbot.txt"),
    "r",
    encoding="utf-8",
) as f:
    SYSTEM_PROMPT = f.read()


def ai_bot_response(msg, history):
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *history,
        {"role": "user", "content": msg},
    ]

    tools = [
        {
            "type": "function",
            "name": "createMultipleChoice",
            "description": "Create a multiple choice question for the user.",
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {"type": "string"},
                    "reason": {"type": "string"},
                    "options": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["question", "reason", "options"],
            },
        },
        {
            "type": "function",
            "name": "createSliderQuestion",
            "description": "Create a question with a slider for a numerical range.",
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {"type": "string"},
                    "reason": {"type": "string"},
                    "min": {"type": "integer"},
                    "max": {"type": "integer"},
                },
                "required": ["question", "reason", "min", "max"],
            },
        },
        {
            "type": "function",
            "name": "createOpenEndedQuestion",
            "description": "Create an open-ended question for the user.",
            "parameters": {
                "type": "object",
                "properties": {
                    "question": {"type": "string"},
                    "reason": {"type": "string"},
                },
                "required": ["question", "reason"],
            },
        },
        {
            "type": "function",
            "name": "recommendations",
            "description": "Create a list of product recommendations.",
            "parameters": {
                "type": "object",
                "properties": {
                    "recommendations": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "text": {"type": "string"},
                                "specs": {"type": "string"},
                                "price": {"type": "string"},
                                "fits": {
                                    "type": "array",
                                    "description": "One entry for each Current Requirement and Current Constraint, except the budget.",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "requirement": {"type": "string"},
                                            "met": {"type": "string", "enum": ["yes", "partly", "no"]},
                                            "note": {"type": "string"},
                                        },
                                        "required": ["requirement", "met", "note"],
                                    },
                                },
                            },
                            "required": ["text", "specs", "price", "fits"],
                        },
                    },
                    "budget_max": {
                        "type": "number",
                        "description": "The user's maximum budget in USD. Use 0 when the user gave no budget.",
                    },
                },
                "required": ["recommendations", "budget_max"],
            },
        },
    ]

    for tool in tools:
        tool["parameters"]["properties"]["new_requirements"] = {
            "type": "array",
            "items": {"type": "string"},
            "description": "New must-haves from the user's latest answer that are not already listed.",
        }
        tool["parameters"]["properties"]["new_constraints"] = {
            "type": "array",
            "items": {"type": "string"},
            "description": "New limits (budget, size, brands to avoid) from the user's latest answer that are not already listed.",
        }

    resp = client.responses.create(
        model="gpt-6.1-terra",
        reasoning={"effort": "low"},
        input=messages,
        tools=tools,
        tool_choice="required",
        parallel_tool_calls=False,
    )

    for event in resp.output:
        if event.type == "function_call":
            fn_name = event.name
            args = json.loads(event.arguments)
            extra = {
                "requirements": args.get("new_requirements") or [],
                "constraints": args.get("new_constraints") or [],
            }

            match fn_name:
                case "createMultipleChoice":
                    return json.dumps(
                        {
                            "type": "question_multiple_choice",
                            "question": args.get("question"),
                            "reasoning": args.get("reason"),
                            "options": args.get("options"),
                            **extra,
                        }
                    )

                case "createSliderQuestion":
                    return json.dumps(
                        {
                            "type": "question_slider",
                            "question": args.get("question"),
                            "reasoning": args.get("reason"),
                            "min": args.get("min"),
                            "max": args.get("max"),
                            **extra,
                        }
                    )

                case "createOpenEndedQuestion":
                    return json.dumps(
                        {
                            "type": "question_open_ended",
                            "question": args.get("question"),
                            "reasoning": args.get("reason"),
                            **extra,
                        }
                    )

                case "recommendations":
                    return json.dumps(
                        {
                            "type": "recommendations_list",
                            "recommendations": args.get("recommendations", []),
                            "budget_max": args.get("budget_max") or None,
                            **extra,
                        }
                    )

    raise RuntimeError("model returned no tool call")
