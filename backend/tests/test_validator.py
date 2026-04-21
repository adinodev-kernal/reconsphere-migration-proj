import unittest
import os
import sys

# Add parent dir to path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock tests for demonstration. Depending on the actual implementations of validator rules,
# these can be adapted to test the specific regexes and functions.

class TestSAPValidationRules(unittest.TestCase):
    def test_vendor_name_length(self):
        # Suppose SAP allows max 35 chars
        name1 = "Short Name Ltd"
        name2 = "This is a very long company name that exceeds thirty five characters"
        self.assertTrue(len(name1) <= 35)
        self.assertFalse(len(name2) <= 35)

    def test_iso_country_code(self):
        valid_codes = ['IN', 'US', 'GB', 'DE']
        self.assertIn('IN', valid_codes)
        self.assertNotIn('IND', valid_codes)
        self.assertNotIn('INDIA', valid_codes)

    def test_ifsc_format(self):
        import re
        ifsc_pattern = re.compile(r'^[A-Z]{4}0[A-Z0-9]{6}$')
        self.assertTrue(bool(ifsc_pattern.match("SBIN0001234")))
        self.assertFalse(bool(ifsc_pattern.match("SBIN1234"))) # too short
        self.assertFalse(bool(ifsc_pattern.match("sbin0001234"))) # lowercase

    def test_payment_terms(self):
        approved_terms = ['NET30', 'NET60', 'NET90', 'IMMEDIATE']
        self.assertIn('NET30', approved_terms)
        self.assertNotIn('NETT30', approved_terms)

if __name__ == '__main__':
    unittest.main()
