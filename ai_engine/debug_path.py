import sys
import os

print("--- PYTHON PATH DEBUG ---")
print(f"Current Working Directory: {os.getcwd()}")
print(f"Python Executable: {sys.executable}")

# Try to find what 'langchain' resolves to
try:
    import langchain
    print(f"SUCCESS: LangChain found at: {langchain.__file__}")
    if "site-packages" not in langchain.__file__:
        print("CRITICAL WARNING: LangChain is being loaded from a LOCAL file, not the library!")
        print("Please rename/delete the file/folder listed above.")
except ImportError as e:
    print(f"ERROR: Could not import langchain. {e}")
except Exception as e:
    print(f"ERROR: {e}")

print("-------------------------")