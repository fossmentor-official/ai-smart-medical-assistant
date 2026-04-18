from google import genai
from config import GEMINI_API_KEY

client = genai.Client(api_key=GEMINI_API_KEY)

SYSTEM_PROMPT = """
You are Total Cura AI Medical Assistant.

Rules:
- You are NOT a doctor.
- Provide safe, general medical guidance only.
- Always suggest consulting a real doctor for serious symptoms.
- If symptoms are dangerous, warn immediately.
- Keep responses clear, structured, and easy to read.

IMPORTANT:
- Do NOT return one long paragraph
- ALWAYS use proper Markdown formatting
"""

def ask_gemini(message: str):
    prompt = f"""
    {SYSTEM_PROMPT}

    STRICT RULES:
    - Each section MUST be on a new line
    - Use EXACT markdown format
    - Add blank line between sections
    - DO NOT merge headings with text
    - DO NOT write in one paragraph

    FORMAT EXACTLY LIKE THIS:

    ## 🩺 Possible Condition
    - Condition 1
    - Condition 2

    ## ⚠ Risk Level
    Low

    ## 📌 Recommendations
    - Step 1
    - Step 2

    ## 🚨 When to See a Doctor
    - Warning 1
    - Warning 2

    User symptoms:
    {message}
    """

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt
    )

    return response.text


"""
# Optional debug
models = client.models.list()
model_names = []

for m in models:
    model_names.append(m.name)

return "\n".join(model_names)
"""