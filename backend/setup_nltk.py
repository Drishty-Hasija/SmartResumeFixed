"""Download the language data SmartResume needs into backend/nltk_data, then verify it.

Run from the backend folder:
    python setup_nltk.py

Verification uses the same lookup as the app. A folder that exists but cannot be read by NLTK
(for example an empty or partly extracted download) is removed and downloaded again.
"""
import os
import shutil
import sys
from pathlib import Path

PACKAGES = {
    "stopwords": "corpora/stopwords",
    "wordnet": "corpora/wordnet",
    "punkt_tab": "tokenizers/punkt_tab",
    "averaged_perceptron_tagger_eng": "taggers/averaged_perceptron_tagger_eng",
}
TARGET = Path(__file__).resolve().parent / "nltk_data"


def _readable(nltk, rel: str) -> bool:
    """Same rule as the app: NLTK must find the resource, and a folder must not be empty."""
    try:
        found = nltk.data.find(rel)
    except LookupError:
        return False
    if isinstance(found, str) and os.path.isdir(found):
        return any(os.scandir(found))
    return True


def main() -> int:
    try:
        import nltk
    except ImportError:
        print("NLTK is not installed. Run:  python -m pip install -r requirements.txt")
        return 1

    TARGET.mkdir(parents=True, exist_ok=True)
    # Look in our folder first, whatever NLTK_DATA is set to on this computer.
    nltk.data.path.insert(0, str(TARGET))
    print(f"Language data folder: {TARGET}")

    for pkg, rel in PACKAGES.items():
        if _readable(nltk, rel):
            print(f"  ok        {rel}")
            continue
        # Remove a broken or partial copy so the download starts clean.
        for leftover in (TARGET / rel, Path(str(TARGET / rel) + ".zip")):
            if leftover.is_dir():
                shutil.rmtree(leftover, ignore_errors=True)
            elif leftover.exists():
                leftover.unlink()
        print(f"  download  {pkg} ...")
        try:
            nltk.download(pkg, download_dir=str(TARGET), quiet=True, raise_on_error=True)
        except Exception as exc:  # network, proxy, SSL or permission problems
            print(f"    download failed: {type(exc).__name__}: {exc}")
        if _readable(nltk, rel):
            print(f"  ok        {rel}")
        else:
            print(f"  MISSING   {rel}")

    missing = [rel for rel in PACKAGES.values() if not _readable(nltk, rel)]
    if missing:
        print("\nStill missing:")
        for rel in missing:
            print(f"  {TARGET / rel}")
        print("\nWhat to do next:")
        print("  1. If the messages above mention a proxy or 'Security Violation', your network uses a proxy.")
        print("     If that proxy is yours or your college's, allow it and run the script again:")
        print("       Windows PowerShell:  $env:NLTK_ALLOW_PROXIED_URLOPEN = '1'; python setup_nltk.py")
        print("  2. Otherwise, copy the nltk_data folder from the project zip into this backend folder,")
        print("     then run this script again.")
        return 1
    print("\nAll language data is present and readable. Start the backend:")
    print("    uvicorn app.main:app --reload --port 8000")
    return 0


if __name__ == "__main__":
    sys.exit(main())