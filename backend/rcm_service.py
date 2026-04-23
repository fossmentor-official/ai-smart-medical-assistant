from google import genai
from config import GEMINI_API_KEY
import asyncio
import json
import re

client = genai.Client(api_key=GEMINI_API_KEY)

RCM_PROMPT = """You are TotalCura's expert medical billing and Revenue Cycle Management AI.

Analyze the clinical visit description and return ONLY valid JSON — no markdown, no explanation:

{
  "icd10_codes": [
    {"code": "E11.65", "description": "Type 2 diabetes mellitus with hyperglycemia", "fee": 0}
  ],
  "cpt_codes": [
    {"code": "99213", "description": "Office visit, established patient, 20-29 min", "fee": 120.00},
    {"code": "85025",  "description": "Complete blood count (CBC) with differential", "fee": 28.00}
  ],
  "standard_fee": 148.00,
  "estimated_reimbursement": 118.40,
  "net_collection": 102.50,
  "denial_probability": 18,
  "errors": [
    {
      "severity": "critical",
      "code": "ERR-001",
      "title": "Missing primary diagnosis linkage",
      "detail": "CPT 85025 is not linked to the primary ICD-10 diagnosis. Payers require medical necessity documentation.",
      "fix": "Add diagnosis pointer linking E11.65 to CPT 85025 on claim line 2."
    },
    {
      "severity": "warning",
      "code": "WARN-002",
      "title": "Modifier may be required",
      "detail": "If this is a telehealth visit, modifier 95 or GT must be appended to E&M codes.",
      "fix": "Confirm visit type and append modifier 95 if telehealth."
    }
  ],
  "optimization_tips": [
    "Upcoding opportunity: documentation supports 99214 (30-39 min) if time is documented",
    "Consider adding HCC code Z83.3 (family history of diabetes) for risk adjustment",
    "Annual Wellness Visit (G0439) may be billable if preventive services were discussed"
  ],
  "revenue_leakage": 45.50,
  "summary": "One-sentence summary of the billing analysis",
  "confidence": 91
}

Rules:
- ICD-10 fees are always 0 (diagnosis codes have no direct fee)
- CPT fees must reflect 2024 Medicare physician fee schedule amounts
- estimated_reimbursement = 80% of standard_fee (typical insurance rate)
- net_collection = estimated_reimbursement minus copay/deductible estimate
- denial_probability: 0-100 integer based on code complexity and documentation gaps
- revenue_leakage: additional revenue achievable with proper coding
- Include 1-3 errors of mixed severity (critical/warning/info)
- Include 2-4 optimization tips
- Return ONLY the JSON object. No markdown fences.

Visit description:
"""

async def analyze_rcm(visit_description: str) -> dict:
    full_prompt = RCM_PROMPT + visit_description

    loop = asyncio.get_event_loop()
    response = await loop.run_in_executor(
        None,
        lambda: client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=full_prompt
        )
    )

    raw = response.text.strip()
    # Strip markdown fences if Gemini wraps in them despite instructions
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON from Gemini: {e}\nRaw: {raw[:300]}")

    # Validate required keys
    required = ["icd10_codes", "cpt_codes", "standard_fee", "estimated_reimbursement",
                "denial_probability", "errors", "summary", "confidence"]
    for key in required:
        if key not in data:
            raise ValueError(f"Missing key in RCM response: {key}")

    return data