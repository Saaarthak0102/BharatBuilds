def get_fallback_reason(language: str) -> str:
    """Return a deterministic fallback reason template for when the model fails."""
    templates = {
        "en": "We're currently unable to generate a customized plan. Please contact your local agricultural extension office or nearest machine aggregator for guidance.",
        "hi": "हम अभी एक अनुकूलित योजना बनाने में असमर्थ हैं। कृपया मार्गदर्शन के लिए अपने स्थानीय कृषि विस्तार कार्यालय या निकटतम मशीन एग्रीगेटर से संपर्क करें।",
        "pa": "ਅਸੀਂ ਇਸ ਸਮੇਂ ਇੱਕ ਅਨੁਕੂਲਿਤ ਯੋਜਨਾ ਬਣਾਉਣ ਵਿੱਚ ਅਸਮਰੱਥ ਹਾਂ। ਕਿਰਪਾ ਕਰਕੇ ਮਾਰਗਦਰਸ਼ਨ ਲਈ ਆਪਣੇ ਸਥਾਨਕ ਖੇਤੀਬਾੜੀ ਵਿਸਥਾਰ ਦਫ਼ਤਰ ਜਾਂ ਨਜ਼ਦੀਕੀ ਮਸ਼ੀਨ ਐਗਰੀਗੇਟਰ ਨਾਲ ਸੰਪਰਕ ਕਰੋ।"
    }
    return templates.get(language, templates["en"])
