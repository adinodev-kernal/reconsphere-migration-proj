# ─────────────────────────────────────────
# validator.py  —  ReconSphere Python Engine
# Reads Excel/CSV, validates against rules JSON,
# calls Gemini AI for corrections, prints JSON to stdout
# ─────────────────────────────────────────
# Usage:
#   python3 validator.py --file path/to/file.xlsx --module vendor_master

import argparse
import json
import os
import re
import sys
import pandas as pd
from pathlib import Path

from ai_engine import get_ai_corrections_batch, rule_based_fix

# ── Paths ──
RULES_DIR = Path(__file__).parent / "rules"

# ── Load reference lists ──
def load_json(name):
    p = RULES_DIR / name
    if p.exists():
        return json.loads(p.read_text())
    return []

ISO_COUNTRIES  = set(load_json("iso_countries.json"))
ISO_CURRENCIES = set(load_json("iso_currencies.json"))
REFERENCE_LISTS = {
    "iso_countries.json":  ISO_COUNTRIES,
    "iso_currencies.json": ISO_CURRENCIES,
}

# ─────────────────────────────────────────
# RULE CHECKERS
# Each returns (is_valid, reason_if_invalid)
# ─────────────────────────────────────────

def check_required(value, _):
    if value is None or str(value).strip() == "" or str(value).lower() == "nan":
        return False, "Field is required but empty"
    return True, None

def check_max_length(value, limit):
    if len(str(value).strip()) > limit:
        return False, f"Exceeds max length of {limit} characters (SAP field limit)"
    return True, None

def check_pattern(value, pattern):
    if not re.match(pattern, str(value).strip()):
        return False, f"Does not match required format: {pattern}"
    return True, None

def check_allowed_values(value, allowed):
    if str(value).strip() not in allowed:
        return False, f"Not in allowed values: {allowed}"
    return True, None

def check_allowed_values_ref(value, ref_name):
    ref = REFERENCE_LISTS.get(ref_name, set())
    if str(value).strip() not in ref:
        return False, f"Not a valid code in {ref_name}"
    return True, None

def check_casing(value, expected):
    v = str(value).strip()
    if expected == "title" and v != v.title():
        return False, f"Expected title case, got: '{v}'"
    if expected == "upper" and v != v.upper():
        return False, f"Expected uppercase, got: '{v}'"
    if expected == "lower" and v != v.lower():
        return False, f"Expected lowercase, got: '{v}'"
    return True, None

def check_unique(value, all_values):
    count = list(all_values).count(str(value).strip())
    if count > 1:
        return False, f"Duplicate value found — '{value}' appears {count} times"
    return True, None

def check_length_if(value, rule, row):
    """Conditional length: only applies when another field matches a value."""
    trigger_field = rule.get("field")
    trigger_value = rule.get("value")
    expected_len  = rule.get("length")
    row_val = str(row.get(trigger_field, "")).strip()
    if row_val == trigger_value:
        actual = len(str(value).strip())
        if actual != expected_len:
            return False, f"Must be exactly {expected_len} digits when {trigger_field}={trigger_value}, got {actual}"
    return True, None

def check_required_if(value, rule, row):
    """Conditional required: only applies when another field matches."""
    trigger_field = rule.get("field")
    trigger_value = rule.get("value")
    row_val = str(row.get(trigger_field, "")).strip()
    if row_val == trigger_value:
        if str(value).strip() in ("", "nan", "None"):
            return False, f"Required when {trigger_field}={trigger_value}"
    return True, None

# ─────────────────────────────────────────
# VALIDATE A SINGLE ROW
# ─────────────────────────────────────────

def validate_row(row_dict, row_num, rules_fields, all_column_values):
    issues = []

    for field, rule in rules_fields.items():
        raw_value = row_dict.get(field, "")
        value     = str(raw_value).strip() if raw_value is not None else ""
        is_nan    = value in ("", "nan", "None", "NaN")

        # Required check
        if rule.get("required") and is_nan:
            issues.append({
                "row":    row_num,
                "field":  field,
                "value":  "",
                "type":   "error",
                "reason": f"{field.replace('_', ' ')} is required but empty",
                "rule":   "Required field",
                "auto_fixable": False,
            })
            continue  # skip other checks if empty

        if is_nan:
            continue  # not required and empty — skip

        # Conditional required
        if "required_if" in rule:
            ok, reason = check_required_if(value, rule["required_if"], row_dict)
            if not ok:
                issues.append({"row": row_num, "field": field, "value": value,
                                "type": "error", "reason": reason,
                                "rule": f"Required when {rule['required_if']['field']}={rule['required_if']['value']}",
                                "auto_fixable": False})
                continue

        # Max length
        if "max_length" in rule:
            ok, reason = check_max_length(value, rule["max_length"])
            if not ok:
                issues.append({"row": row_num, "field": field, "value": value,
                                "type": "error", "reason": reason,
                                "rule": f"Max length {rule['max_length']} (SAP field limit)",
                                "auto_fixable": True})

        # Pattern
        if "pattern" in rule:
            ok, reason = check_pattern(value, rule["pattern"])
            if not ok:
                issues.append({"row": row_num, "field": field, "value": value,
                                "type": "error", "reason": reason,
                                "rule": f"Format pattern: {rule['pattern']}",
                                "auto_fixable": False})

        # Allowed values (hardcoded list)
        if "allowed_values" in rule:
            ok, reason = check_allowed_values(value, rule["allowed_values"])
            if not ok:
                issues.append({"row": row_num, "field": field, "value": value,
                                "type": "error", "reason": reason,
                                "rule": f"Allowed values: {rule['allowed_values']}",
                                "auto_fixable": True})

        # Allowed values (reference file)
        if "allowed_values_ref" in rule:
            ok, reason = check_allowed_values_ref(value, rule["allowed_values_ref"])
            if not ok:
                issues.append({"row": row_num, "field": field, "value": value,
                                "type": "warning", "reason": reason,
                                "rule": f"Must be valid code in {rule['allowed_values_ref']}",
                                "auto_fixable": True})

        # Casing
        if "casing" in rule:
            ok, reason = check_casing(value, rule["casing"])
            if not ok:
                issues.append({"row": row_num, "field": field, "value": value,
                                "type": "warning", "reason": reason,
                                "rule": f"Casing must be: {rule['casing']}",
                                "auto_fixable": True})

        # Unique
        if rule.get("unique") and field in all_column_values:
            ok, reason = check_unique(value, all_column_values[field])
            if not ok:
                issues.append({"row": row_num, "field": field, "value": value,
                                "type": "error", "reason": reason,
                                "rule": "Must be unique across all rows",
                                "auto_fixable": False})

        # Conditional length
        if "length_if" in rule:
            ok, reason = check_length_if(value, rule["length_if"], row_dict)
            if not ok:
                issues.append({"row": row_num, "field": field, "value": value,
                                "type": "error", "reason": reason,
                                "rule": f"Conditional length rule",
                                "auto_fixable": True})

    return issues

# ─────────────────────────────────────────
# MAIN VALIDATION FUNCTION
# ─────────────────────────────────────────

def validate_file(file_path, module):
    # Load rules
    rules_path = RULES_DIR / f"{module}.json"
    if not rules_path.exists():
        return {"error": f"Rules not found for module: {module}"}

    rules = json.loads(rules_path.read_text())
    fields = rules.get("fields", {})

    # Read file
    ext = Path(file_path).suffix.lower()
    try:
        if ext in (".xlsx", ".xls"):
            df = pd.read_excel(file_path, dtype=str)
        else:
            df = pd.read_csv(file_path, dtype=str)
    except Exception as e:
        return {"error": f"Could not read file: {str(e)}"}

    df = df.fillna("")

    # Build column value lists for uniqueness checks
    all_column_values = {col: df[col].tolist() for col in df.columns}

    # Validate all rows
    all_issues = []
    rows_data  = df.to_dict("records")

    for idx, row in enumerate(rows_data):
        row_issues = validate_row(row, idx + 2, fields, all_column_values)  # +2: header row is row 1
        all_issues.extend(row_issues)

    # ── AI corrections for fixable issues ──

    fixable     = [i for i in all_issues if i.get("auto_fixable")]
    non_fixable = [i for i in all_issues if not i.get("auto_fixable")]

    # Single API call for all fixable issues at once
    if fixable:
        corrections = get_ai_corrections_batch(fixable, module)
        for issue, correction in zip(fixable, corrections):
            issue["ai_suggestion"] = correction.get("corrected_value")
            issue["confidence"]    = correction.get("confidence", 0)
            issue["ai_reason"]     = correction.get("reason", "")
            issue["auto_fixed"]    = (
                correction.get("confidence", 0) >= 90
                and correction.get("corrected_value") is not None
            )

    # Non-fixable issues get null AI fields
    for issue in non_fixable:
        issue["ai_suggestion"] = None
        issue["confidence"]    = 0
        issue["ai_reason"]     = ""
        issue["auto_fixed"]    = False

    errors   = [i for i in all_issues if i["type"] == "error"]
    warnings = [i for i in all_issues if i["type"] == "warning"]
    auto_fixed = [i for i in all_issues if i.get("auto_fixed")]

    return {
        "total_rows":   len(df),
        "error_count":  len(errors),
        "warning_count":len(warnings),
        "auto_fixed":   len(auto_fixed),
        "clean_rows":   len(df) - len(set(i["row"] for i in all_issues)),
        "module":       module,
        "sap_table":    rules.get("sap_table", ""),
        "issues":       all_issues,
        "rows":         rows_data,
        "columns":      list(df.columns),
    }

# ─────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--file",   required=True)
    parser.add_argument("--module", required=False, default="vendor_master")
    args = parser.parse_args()

    try:
        result = validate_file(args.file, args.module)
    except Exception as e:
        import traceback
        result = {"error": str(e), "traceback": traceback.format_exc()}

    # ALWAYS print to stdout no matter what
    sys.stdout.write(json.dumps(result, ensure_ascii=False, default=str))
    sys.stdout.write("\n")
    sys.stdout.flush()