"""Tests for the JSON-file-backed LLM cache (Seam: app.seed.pdfs.llm_cache)."""

from app.seed.pdfs.llm_cache import LlmCache, cache_key


def test_cache_key_is_stable_regardless_of_key_order():
    context_a = {"area": "Sales", "value": 1}
    context_b = {"value": 1, "area": "Sales"}
    assert cache_key(context_a) == cache_key(context_b)


def test_cache_key_differs_for_different_context():
    assert cache_key({"value": 1}) != cache_key({"value": 2})


def test_cache_set_then_get_roundtrips(tmp_path):
    cache = LlmCache(tmp_path / "cache.json")
    key = cache_key({"value": 1})

    assert cache.get(key) is None
    cache.set(key, {"narrative": "hello"})
    assert cache.get(key) == {"narrative": "hello"}


def test_cache_persists_across_instances_after_save(tmp_path):
    path = tmp_path / "cache.json"
    cache = LlmCache(path)
    key = cache_key({"value": 1})
    cache.set(key, {"narrative": "hello"})
    cache.save()

    reloaded = LlmCache(path)
    assert reloaded.get(key) == {"narrative": "hello"}


def test_cache_starts_empty_when_file_does_not_exist(tmp_path):
    cache = LlmCache(tmp_path / "does-not-exist.json")
    assert cache.get(cache_key({"value": 1})) is None
