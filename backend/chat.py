import sys
import json
import os
import re
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

def get_chat_response(prompt, context):
    try:
        import google.generativeai as genai
        if not GEMINI_API_KEY or "your_gemini" in GEMINI_API_KEY:
            return {"reply": "API key not configured. Please add your GEMINI_API_KEY to the backend/.env file."}
        
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")

        full_prompt = f"""You are a helpful AI assistant specialized in SAP S/4HANA data migration.
A user is reviewing a flagged row of data and has asked you a question.

Here is the context of the data row:
{json.dumps(context, indent=2)}

User's question: {prompt}

Please provide a concise, helpful answer focusing on SAP data formatting or rule standards.
"""
        response = model.generate_content(
            full_prompt,
            generation_config={"temperature": 0.3, "max_output_tokens": 500}
        )
        return {"reply": response.text.strip()}
    except Exception as e:
        return {"reply": f"An error occurred: {str(e)}"}

if __name__ == "__main__":
    try:
        # Read JSON from stdin
        input_data = sys.stdin.read()
        data = json.loads(input_data)
        
        prompt = data.get("prompt", "")
        context = data.get("context", {})
        
        result = get_chat_response(prompt, context)
        
        # Output JSON
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
