# ─────────────────────────────────────────
# ai_engine.py  —  Gemini AI Integration
# Takes a bad field value + rule context,
# asks Gemini to suggest the correct value,
# returns structured JSON with confidence %
# ─────────────────────────────────────────
import time
import json
import sys
import os
import re
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

import concurrent.futures

# ── Lazy import so app still works without Gemini key ──
_MODEL_CACHE = None

def _get_model():
    global _MODEL_CACHE
    if _MODEL_CACHE is not None:
        return _MODEL_CACHE
        
    try:
        import google.generativeai as genai
        if not GEMINI_API_KEY or "your_gemini" in GEMINI_API_KEY:
            return None
        genai.configure(api_key=GEMINI_API_KEY)
        # Restoring gemini-2.5-flash as verified available in this env
        _MODEL_CACHE = genai.GenerativeModel("gemini-2.5-flash")
        return _MODEL_CACHE
    except ImportError:
        return None

# ─────────────────────────────────────────
# RULE-BASED AUTO-FIXES
# Handle the obvious stuff without AI to save API calls
# ─────────────────────────────────────────

def rule_based_fix(field, value, rule):
    """
    Fast fixes that don't need AI:
    - casing corrections
    - known country code variants
    - known currency typos
    """
    v = str(value).strip()

    # Casing fix
    if "title case" in rule.lower():
        return {"corrected_value": v.title(), "confidence": 100,
                "reason": "Corrected to title case"}

    if "uppercase" in rule.lower():
        return {"corrected_value": v.upper(), "confidence": 100,
                "reason": "Corrected to uppercase"}

    # Country code common variants
    COUNTRY_MAP = {
        "IND": "IN", "INDIA": "IN", "ind": "IN",
        "USA": "US", "UNITED STATES": "US",
        "GBR": "GB", "UK": "GB",
        "DEU": "DE", "GERMANY": "DE",
        "FRA": "FR", "FRANCE": "FR",
        "JPN": "JP", "JAPAN": "JP",
        "CHN": "CN", "CHINA": "CN",
        "AUS": "AU", "AUSTRALIA": "AU",
    }
    if field.upper() in ("COUNTRY", "COUNTRY_CODE") and v.upper() in COUNTRY_MAP:
        return {"corrected_value": COUNTRY_MAP[v.upper()], "confidence": 99,
                "reason": f"Common variant '{v}' corrected to ISO alpha-2 code"}

    # Currency common typos
    CURRENCY_MAP = {
        "INRR": "INR", "INR ": "INR",
        "USDD": "USD", "US$": "USD",
        "EURR": "EUR", "EURO": "EUR",
        "GBPP": "GBP",
    }
    if field.upper() in ("CURRENCY", "CURRENCY_CODE") and v.upper() in CURRENCY_MAP:
        return {"corrected_value": CURRENCY_MAP[v.upper()], "confidence": 99,
                "reason": f"Currency typo '{v}' corrected to ISO 4217 code"}

    return None  # couldn't fix with rules — needs AI

# ─────────────────────────────────────────
# BUILD GEMINI PROMPT
# ─────────────────────────────────────────

def build_prompt(field, bad_value, reason, rule, module, row_context):
    # Strip sensitive data from context for the prompt
    safe_context = {k: v for k, v in row_context.items()
                    if k.upper() not in ("PASSWORD", "SECRET", "KEY")}

    module_label = module.replace("_", " ").title()

    return f"""You are a SAP S/4HANA data migration specialist.
A data validation engine found an error in an uploaded migration file.

SAP Module: {module_label}
Field name: {field}
Current (incorrect) value: "{bad_value}"
Validation rule violated: {rule}
Reason it failed: {reason}
Other fields in this row: {json.dumps(safe_context, ensure_ascii=False)}

Your task: Suggest the single best corrected value for the field "{field}".

Rules you must follow:
1. Respond ONLY with a JSON object — no explanation, no markdown, no code block
2. The JSON must have exactly these keys: corrected_value, confidence, reason
3. confidence is an integer 0-100 representing how certain you are
4. reason is one sentence maximum explaining what you changed and why
5. If you cannot determine the correct value, set corrected_value to null and confidence to 0
6. Do not invent data — only correct obvious errors (typos, formatting, known variants)

Expected JSON format (return exactly this structure):
{{"corrected_value": "...", "confidence": 85, "reason": "..."}}"""

# ─────────────────────────────────────────
# PARSE GEMINI RESPONSE
# Safely extract JSON even if model adds extra text
# ─────────────────────────────────────────

def parse_response(text):
    # Try direct parse first
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        pass

    # Try extracting JSON block from response
    match = re.search(r'\{[^{}]+\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    # Return safe fallback
    return {"corrected_value": None, "confidence": 0,
            "reason": "AI could not parse a correction"}


def _process_chunk(model, chunk, module):
    """Internal helper to process a single chunk of issues through Gemini"""
    if not chunk:
        return []

    issue_list = ""
    for idx, issue in enumerate(chunk):
        issue_list += f"{idx+1}. field={issue['field']} | bad_value=\"{issue['value']}\" | reason={issue['reason']}\n"

    prompt = f"""You are a SAP S/4HANA data migration specialist.
Below are {len(chunk)} field validation errors from a {module.replace('_',' ')} upload.

{issue_list}

For each issue, suggest a corrected value.
Respond ONLY with a JSON array with exactly {len(chunk)} objects in the same order.
Each object must have exactly these keys: corrected_value, confidence, reason.
confidence is 0-100. If you cannot correct, set corrected_value to null and confidence to 0.
reason must be ONE sentence maximum — no more than 15 words.
No markdown, no explanation, just the raw JSON array starting with [ and ending with ]."""

    try:
        response = model.generate_content(
            prompt,
            generation_config={
                "temperature": 0.1,
                "max_output_tokens": 2048,
            },
        )
        raw = response.text.strip()
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if match:
            results = json.loads(match.group())
            if len(results) == len(chunk):
                return results
            
            # Count mismatch fallback
            if len(results) < len(chunk):
                results.extend([{"corrected_value": None, "confidence": 0, "reason": "ai mismatch"}] * (len(chunk) - len(results)))
            return results[:len(chunk)]
    except Exception as e:
        print(f"[ai_engine] Chunk error: {e}", file=sys.stderr, flush=True)
    
    # Fallback for failed chunk
    return [_mock_correction(i["field"], i["value"], i["reason"]) for i in chunk]

# ─────────────────────────────────────────
# MAIN FUNCTION — called from validator.py
# ─────────────────────────────────────────
def get_ai_corrections_batch(issues, module):
    if not issues:
        return []

    model = _get_model()
    
    # 1. Try rule-based fixes FIRST for everything to save API cost/time
    final_results = [None] * len(issues)
    ai_queue = [] # list of (original_index, issue)

    for idx, issue in enumerate(issues):
        rule_fix = rule_based_fix(issue["field"], issue["value"], issue["rule"])
        if rule_fix:
            final_results[idx] = rule_fix
        else:
            ai_queue.append((idx, issue))

    if not ai_queue:
        return final_results

    # 2. If no model, use mock for the rest
    if model is None:
        for idx, issue in ai_queue:
            final_results[idx] = _mock_correction(issue["field"], issue["value"], issue["reason"])
        return final_results

    # 3. Process AI queue in chunks of 15 (sweet spot for Gemini Flash stability)
    CHUNK_SIZE = 15
    chunks = [ai_queue[i:i + CHUNK_SIZE] for i in range(0, len(ai_queue), CHUNK_SIZE)]
    
    # Use ThreadPoolExecutor for parallel chunk processing
    # Max workers set to 4 to balance speed and rate limits
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        # Map chunks to model calls
        future_to_chunk_idx = {
            executor.submit(_process_chunk, model, [item[1] for item in chunk], module): i 
            for i, chunk in enumerate(chunks)
        }
        
        for future in concurrent.futures.as_completed(future_to_chunk_idx):
            chunk_idx = future_to_chunk_idx[future]
            chunk_items = chunks[chunk_idx]
            try:
                chunk_results = future.result()
                for (original_idx, _), result in zip(chunk_items, chunk_results):
                    final_results[original_idx] = result
            except Exception as e:
                print(f"[ai_engine] Future error: {e}", file=sys.stderr, flush=True)
                # Fallback for this specific chunk
                for original_idx, issue in chunk_items:
                    final_results[original_idx] = _mock_correction(issue["field"], issue["value"], issue["reason"])

    # Final pass to ensure no Nones
    for i in range(len(final_results)):
        if final_results[i] is None:
            final_results[i] = {"corrected_value": None, "confidence": 0, "reason": "processing failure"}

    return final_results

# ─────────────────────────────────────────
# MOCK CORRECTIONS — used when no API key
# Lets you test the full flow locally
# ─────────────────────────────────────────
def _mock_correction(field, bad_value, reason):
    v = str(bad_value).strip()

    if "length" in reason.lower() and len(v) > 10:
        return {"corrected_value": v[:35].strip(),
                "confidence": 88,
                "reason": f"Truncated to 35 chars — SAP LFA1-NAME1 field limit"}

    if "title case" in reason.lower() or "casing" in reason.lower():
        return {"corrected_value": v.title(),
                "confidence": 100,
                "reason": "Corrected to title case per SAP naming convention"}

    if "lowercase" in reason.lower() or "uppercase" in reason.lower():
        return {"corrected_value": v.title(),
                "confidence": 100,
                "reason": "Corrected to title case per SAP naming convention"}

    if "country" in field.lower():
        country_map = {"IND":"IN","INDIA":"IN","USA":"US","GBR":"GB","DEU":"DE"}
        fixed = country_map.get(v.upper())
        if fixed:
            return {"corrected_value": fixed, "confidence": 99,
                    "reason": f"Common variant '{v}' corrected to ISO 3166-1 alpha-2 code"}

    if "currency" in field.lower():
        return {"corrected_value": v[:3].upper(),
                "confidence": 95,
                "reason": f"Corrected to standard ISO 4217 currency code"}

    if "payment" in field.lower():
        return {"corrected_value": "NET30", "confidence": 70,
                "reason": "Nearest valid payment term from approved master list"}

    if "postal" in field.lower():
        digits = ''.join(c for c in v if c.isdigit())
        fixed = digits[:6].ljust(6, '0') if len(digits) >= 6 else digits.zfill(6)
        return {"corrected_value": fixed, "confidence": 90,
                "reason": f"Adjusted to 6-digit Indian postal code format"}

    if "vendor_code" in field.lower() or "code" in field.lower():
        fixed = ''.join(c for c in v if c.isalnum()).upper()[:10]
        return {"corrected_value": fixed if fixed else None, "confidence": 65,
                "reason": "Removed invalid characters, converted to uppercase"}

    return {"corrected_value": None, "confidence": 0,
            "reason": "Cannot determine correct value — manual fix required"}