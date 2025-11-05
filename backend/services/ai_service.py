import httpx
import json
from typing import Optional, Dict, List
from models.schemas import CategoryEnum

class AIService:
    def __init__(self):
        self.api_key = "AIzaSyBcnPIGkKdkSpoJaPv3W3mw3uV7c9pH2QI"
        self.api_url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

    async def _generate_content(self, prompt: str) -> str:
        """Helper to call Gemini API and return text"""
        headers = {"Content-Type": "application/json"}
        params = {"key": self.api_key}
        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(self.api_url, headers=headers, params=params, json=payload)
                response.raise_for_status()
                data = response.json()
                
                # Extract response text
                candidates = data.get("candidates", [])
                if not candidates:
                    return "No response received."
                
                return candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "").strip()
        except Exception as e:
            print(f"Gemini API error: {e}")
            return ""

    # ---------- CATEGORY PREDICTION ----------
    async def predict_category(self, item_name: str) -> CategoryEnum:
        prompt = f"""
        Based on the item name "{item_name}", predict the most appropriate expense category.
        Categories:
        - food
        - travel
        - shopping
        - entertainment
        - health
        - utilities
        - rent
        - education
        - other

        Return only one category name in lowercase.
        """
        text = await self._generate_content(prompt)
        category = text.strip().lower()

        for cat in CategoryEnum:
            if cat.value == category:
                return cat
        return CategoryEnum.OTHER

    # ---------- ITEM SUGGESTIONS ----------
    async def get_item_suggestions(self, item_name: str, category: CategoryEnum, amount: float) -> Dict:
        prompt = f"""
        Analyze this expense:
        Item: {item_name}
        Category: {category.value}
        Amount: ₹{amount}

        Provide JSON with:
        {{
            "health_impact": "2-3 sentences on benefits or risks",
            "alternatives": ["alt1", "alt2", "alt3"],
            "smart_tip": "one actionable saving/health tip",
            "frequency_suggestion": "recommended frequency"
        }}
        """
        text = await self._generate_content(prompt)

        try:
            # Extract JSON portion
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            return json.loads(text)
        except Exception:
            return {
                "health_impact": "No specific health impact identified.",
                "alternatives": [],
                "smart_tip": "Track your spending to make informed decisions.",
                "frequency_suggestion": "As needed"
            }

    # ---------- ANALYZE SPENDING ----------
    async def analyze_spending_patterns(self, expenses: List[Dict], user_preferences: Dict) -> Dict:
        total = sum(e.get('amount', 0) for e in expenses)
        by_category = {}
        for e in expenses:
            cat = e.get('category', 'other')
            by_category[cat] = by_category.get(cat, 0) + e.get('amount', 0)
        top_categories = sorted(by_category.items(), key=lambda x: x[1], reverse=True)[:3]

        prompt = f"""
        Analyze this user's spending:
        Total spent: ₹{total}
        Top categories:
        {chr(10).join([f"- {cat}: ₹{amt}" for cat, amt in top_categories])}
        Currency: {user_preferences.get('currency', 'INR')}

        Provide insights JSON:
        {{
            "spending_pattern": "...",
            "predicted_expenses": "...",
            "savings_tips": ["tip1", "tip2", "tip3"],
            "wasteful_expenses": ["..."],
            "budget_recommendation": "..."
        }}
        """
        text = await self._generate_content(prompt)

        try:
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            return json.loads(text)
        except Exception:
            return {
                "spending_pattern": "Analysis unavailable",
                "predicted_expenses": "Unable to predict",
                "savings_tips": ["Track expenses regularly"],
                "wasteful_expenses": [],
                "budget_recommendation": "Set a realistic budget"
            }

    # ---------- CHATBOT ----------
    async def chatbot_response(self, message: str, context: Optional[Dict] = None) -> str:
        context_str = f"\nUser context: {json.dumps(context, indent=2)}" if context else ""
        prompt = f"""
        You are a helpful AI assistant for a finance and health tracking app.
        Help users with spending insights, saving advice, and healthy lifestyle suggestions.
        {context_str}

        User: {message}
        Respond conversationally (2-4 sentences).
        """
        text = await self._generate_content(prompt)
        return text or "I'm here to help! Could you please rephrase your question?"

    # ---------- VOICE INPUT PARSER ----------
    async def parse_voice_input(self, voice_text: str) -> Dict:
        prompt = f"""
        Parse this expense input:
        "{voice_text}"
        Return JSON:
        {{
            "item_name": "...",
            "amount": number,
            "category": "...",
            "date": "...",
            "notes": "..."
        }}
        """
        text = await self._generate_content(prompt)

        try:
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            return json.loads(text)
        except Exception:
            return None
