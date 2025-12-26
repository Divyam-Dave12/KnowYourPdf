import pkgutil
import langchain
import langchain_community

print("--- SEARCHING FOR RETRIEVALQA ---")

# Check langchain
try:
    import langchain.chains
    print("✅ langchain.chains EXISTS")
    if hasattr(langchain.chains, "RetrievalQA"):
        print("   -> Found RetrievalQA in: langchain.chains")
except ImportError:
    print("❌ langchain.chains DOES NOT EXIST")

# Check langchain.chains (Legacy path specific)
try:
    from langchain.chains import RetrievalQA
    print("✅ Import successful: from langchain.chains import RetrievalQA")
except ImportError:
    print("❌ Import failed: from langchain.chains import RetrievalQA")

# Check langchain_community
try:
    import langchain_community.chains
    print("✅ langchain_community.chains EXISTS")
except ImportError:
    print("❌ langchain_community.chains DOES NOT EXIST")
    
# Check manual directory scan
print("\n--- CHECKING FOLDERS ---")
lc_path = langchain.__path__[0]
print(f"LangChain Path: {lc_path}")
import os
if os.path.exists(lc_path):
    print("Subfolders in langchain:", [f for f in os.listdir(lc_path) if os.path.isdir(os.path.join(lc_path, f))])
else:
    print("LangChain path does not exist on disk!")

print("-----------------------------")