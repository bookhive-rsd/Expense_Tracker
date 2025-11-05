# backend/utils/helpers.py
"""Utility helper functions"""

def format_currency(amount, currency="INR"):
    """Format amount as currency string"""
    symbols = {"INR": "₹", "USD": "$", "EUR": "€"}
    return f"{symbols.get(currency, ''){amount:.2f}}"

def validate_date(date_str):
    """Validate date string format"""
    from datetime import datetime
    try:
        datetime.fromisoformat(date_str)
        return True
    except:
        return False