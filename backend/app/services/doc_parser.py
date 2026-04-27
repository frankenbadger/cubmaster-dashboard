import anthropic
import os
import json
import logging

logger = logging.getLogger(__name__)


def parse_document_with_ai(extracted_text: str) -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY", "")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY is not set")

    model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")
    client = anthropic.Anthropic(api_key=api_key)

    prompt = f"""You are helping a Cub Scout Cubmaster extract key information from a scouting document.

Extract the following information from this document and return ONLY valid JSON with these exact keys:
{{
  "event_name": "string or null",
  "event_type": "string or null (e.g. Day Camp, Resident Camp, Camporee, Training)",
  "start_date": "YYYY-MM-DD or null",
  "end_date": "YYYY-MM-DD or null",
  "registration_deadline": "YYYY-MM-DD or null",
  "location": "string or null",
  "address": "string or null",
  "cost_scout": "string or null (include $ and any per-night vs flat fee notes)",
  "cost_adult": "string or null",
  "cost_notes": "string or null (any other cost info, scholarships, etc)",
  "contact_name": "string or null",
  "contact_email": "string or null",
  "contact_phone": "string or null",
  "registration_url": "string or null",
  "age_requirements": "string or null",
  "what_to_bring": "string or null (brief summary)",
  "key_notes": ["array of important bullet points the cubmaster should know"],
  "family_summary": "2-3 sentence plain English summary suitable for sharing with scout families"
}}

Document text:
{extracted_text[:6000]}

Return ONLY the JSON object, no markdown, no explanation."""

    message = client.messages.create(
        model=model,
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = message.content[0].text.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        raw = parts[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw.strip())
