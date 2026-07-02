FROM python:3.12-slim

WORKDIR /app

ENV POETRY_VIRTUALENVS_IN_PROJECT=false \
    POETRY_VIRTUALENVS_PATH=/opt/venv \
    POETRY_NO_INTERACTION=1

RUN pip install poetry==2.3.2

COPY pyproject.toml poetry.lock ./
RUN poetry install --no-ansi --no-root

COPY . .

CMD ["poetry", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
