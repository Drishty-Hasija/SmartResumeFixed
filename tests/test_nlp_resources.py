"""Missing NLTK data must produce a clear, actionable error, never a generic analysis failure."""
import pytest

from app.services import nlp_resources, workflows
from app.utils.errors import AppError


def test_missing_data_is_reported_by_name(monkeypatch):
    monkeypatch.setattr(nlp_resources, "_NLTK_RESOURCES", {"nonexistent": "corpora/does_not_exist_xyz"})
    monkeypatch.setattr(nlp_resources.nltk, "download", lambda *a, **k: False)  # offline
    with pytest.raises(nlp_resources.NlpResourcesMissing) as info:
        nlp_resources.ensure_nltk.__wrapped__()  # bypass the lru_cache
    assert info.value.missing == ["nonexistent"]


def test_analysis_reports_missing_data_with_a_hint(monkeypatch):
    def boom(_text):
        raise nlp_resources.NlpResourcesMissing(["punkt_tab"])

    monkeypatch.setattr(workflows, "analyze_resume", boom)

    class FakeResume:
        id = 1
        raw_text = "Experience and skills."
        status = "processing"
        error = None

    class FakeDB:
        def commit(self):
            pass

    with pytest.raises(AppError) as info:
        workflows.run_analysis(FakeDB(), FakeResume())
    err = info.value
    assert err.code == "nlp_resources_missing"
    assert err.status_code == 503
    assert "backend/nltk_data" in err.hint
