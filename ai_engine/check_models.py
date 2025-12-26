import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load your API key
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    print("❌ Error: API Key not found in .env")
else:
    genai.configure(api_key=api_key)
    print("\n🔍 Checking available models for your API key...\n")
    
    try:
        found_any = False
        for m in genai.list_models():
            # We only care about models that can generate text (Chat)
            if 'generateContent' in m.supported_generation_methods:
                print(f"✅ AVAILABLE: {m.name}")
                found_any = True
        
        if not found_any:
            print("❌ No chat models found. Check your API key permissions.")
            
    except Exception as e:
        print(f"❌ Error connecting to Google: {e}")