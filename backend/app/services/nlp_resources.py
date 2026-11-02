"""Lazy loading of NLP models/corpora (NLTK data, spaCy model).

Loading is done once per process and cached. Missing NLTK corpora are
downloaded automatically on first use.
"""
import logging
import os
from functools import lru_cache

from app.config import BACKEND_DIR

# NLTK data ships inside the backend bundle (backend/nltk_data) so nothing is downloaded at
# runtime; Vercel's filesystem is read-only apart from /tmp.
os.environ.setdefault("NLTK_DATA", str(BACKEND_DIR / "nltk_data"))

import nltk  # noqa: E402

logger = logging.getLogger(__name__)

# Always search the bundled folder first, even when NLTK_DATA points somewhere else on this computer.
_BUNDLE_DIR = str(BACKEND_DIR / "nltk_data")
if _BUNDLE_DIR not in nltk.data.path:
    nltk.data.path.insert(0, _BUNDLE_DIR)

_NLTK_RESOURCES = {
    "stopwords": "corpora/stopwords",
    "wordnet": "corpora/wordnet",
    "punkt_tab": "tokenizers/punkt_tab",
    "averaged_perceptron_tagger_eng": "taggers/averaged_perceptron_tagger_eng",
}


NLTK_BUNDLE = BACKEND_DIR / "nltk_data"


class NlpResourcesMissing(RuntimeError):
    """Language data needed for analysis is neither bundled nor downloadable."""

    def __init__(self, missing: list[str]):
        self.missing = missing
        self.searched = str(NLTK_BUNDLE)
        super().__init__(f"Missing NLTK data {', '.join(missing)}. Expected in: {NLTK_BUNDLE}")


def _has(path: str) -> bool:
    """True only if NLTK can find the resource AND it actually has contents (not an empty folder)."""
    try:
        found = nltk.data.find(path)
    except LookupError:
        return False
    if isinstance(found, str) and os.path.isdir(found):
        return any(os.scandir(found))
    return True


@lru_cache(maxsize=1)
def ensure_nltk() -> None:
    """Make sure the NLTK data is available, or fail with a message that names what is missing.

    Normally the data is in backend/nltk_data (see README). Downloading is only a fallback. A failure
    is raised, never swallowed, so the user sees the real reason instead of a generic analysis error.
    Failures are not cached by lru_cache, so the next request checks again.
    """
    for name, path in _NLTK_RESOURCES.items():
        if not _has(path):
            logger.info("NLTK resource %s not bundled; trying to download it", name)
            try:
                nltk.download(name, quiet=True, raise_on_error=False)
            except Exception as exc:  # network, proxy or SSL problems
                logger.warning("Download of NLTK resource %s failed: %s", name, exc)
    missing = [name for name, path in _NLTK_RESOURCES.items() if not _has(path)]
    if missing:
        raise NlpResourcesMissing(missing)


@lru_cache(maxsize=1)
def get_spacy():
    """Return the spaCy small English model, or None if it is not installed."""
    try:
        import spacy

        return spacy.load(
            "en_core_web_sm", disable=["tagger", "parser", "attribute_ruler", "lemmatizer"]
        )
    except Exception:  # model missing / spaCy broken
        logger.warning("spaCy model 'en_core_web_sm' unavailable; NER disabled. "
                       "Run: python -m spacy download en_core_web_sm")
        return None


def warm_up() -> None:
    """Load everything once at startup so the first request is fast."""
    ensure_nltk()
    get_spacy()