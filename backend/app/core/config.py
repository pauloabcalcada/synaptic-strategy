from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    OPENAI_API_KEY: str
    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"
    REDIS_URL: str
    ENVIRONMENT: str = "development"

    model_config = {"env_file": ".env", "case_sensitive": True}
