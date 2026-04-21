from google import genai
from config import GEMINI_API_KEY
import asyncio

client = genai.Client(api_key=GEMINI_API_KEY)

PROMPTS = {
    "clinical": """You are TotalCura's clinical AI. Analyze symptoms and return ONLY valid JSON:
{
  "type": "clinical",
  "summary": "one sentence summary",
  "possible_diagnosis": ["diagnosis1", "diagnosis2"],
  "risk_level": "low|medium|high",
  "risk_score": 40,
  "recommended_tests": ["test1", "test2"],
  "treatment_plan": ["step1", "step2"],
  "medications": ["med - dose"],
  "soap_notes": {
    "subjective": "patient reported...",
    "objective": "clinical findings...",
    "assessment": "clinical assessment...",
    "plan": "management plan..."
  },
  "when_to_refer": "referral criteria or null",
  "confidence": 87
}
Return ONLY the JSON. No markdown, no explanation.""",

    "billing": """You are TotalCura's billing AI. Return ONLY valid JSON:
{
  "type": "billing",
  "summary": "billing summary",
  "icd10_codes": [{"code": "E11.9", "description": "Type 2 Diabetes"}],
  "cpt_codes": [{"code": "99213", "description": "Office visit"}],
  "estimated_reimbursement": "$180-220",
  "denial_risks": ["risk1"],
  "optimization_tips": ["tip1"]
}""",

    "docs": """You are TotalCura's documentation AI. Return ONLY valid JSON:
{
  "type": "docs",
  "document_type": "SOAP Note",
  "content": "full document text",
  "follow_up": "follow-up instructions"
}""",

    "insights": """You are TotalCura's analytics AI. Return ONLY valid JSON:
{
  "type": "insights",
  "summary": "insight summary",
  "key_metrics": [{"label": "Avg Wait", "value": "18 min", "trend": "down"}],
  "recommendations": ["rec1"],
  "projected_improvement": "25% efficiency gain"
}"""
}

async def ask_gemini_stream(message: str, mode: str = "clinical"):
    prompt = PROMPTS.get(mode, PROMPTS["clinical"])
    full_prompt = f"{prompt}\n\nUser input: {message}"

    try:
        # Run sync Gemini call in thread pool to not block event loop
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.models.generate_content(
                model="gemini-2.5-flash-lite",
                contents=full_prompt
            )
        )
        # Stream the response text in chunks
        text = response.text
        chunk_size = 20
        for i in range(0, len(text), chunk_size):
            yield text[i:i+chunk_size]
            await asyncio.sleep(0.01)
    except Exception as e:
        yield f'{{"error": "{str(e)}"}}'