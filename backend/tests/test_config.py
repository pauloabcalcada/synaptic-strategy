"""Seam B: Settings loads all documented env vars without error."""

from unittest.mock import patch


ENV = {
    "DATABASE_URL": "postgresql+asyncpg://user:pw@localhost:5432/db",
    "SUPABASE_URL": "https://example.supabase.co",
    "SUPABASE_ANON_KEY": "anon-key",
    "OPENAI_API_KEY": "sk-test",
    "REDIS_URL": "redis://localhost:6379",
    "ENVIRONMENT": "test",
}


class TestSettings:
    def test_loads_all_env_vars(self):
        with patch.dict("os.environ", ENV, clear=True):
            from app.core.config import Settings

            s = Settings()

        assert s.DATABASE_URL == ENV["DATABASE_URL"]
        assert s.SUPABASE_URL == ENV["SUPABASE_URL"]
        assert s.SUPABASE_ANON_KEY == ENV["SUPABASE_ANON_KEY"]
        assert s.OPENAI_API_KEY == ENV["OPENAI_API_KEY"]
        assert s.REDIS_URL == ENV["REDIS_URL"]
        assert s.ENVIRONMENT == ENV["ENVIRONMENT"]

    def test_openai_chat_model_defaults_to_gpt_4o_mini(self):
        with patch.dict("os.environ", ENV, clear=True):
            from app.core.config import Settings

            s = Settings()

        assert s.OPENAI_CHAT_MODEL == "gpt-4o-mini"
