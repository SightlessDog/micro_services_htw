FROM python:3.11-slim AS deps
WORKDIR /app
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.11-slim AS runner
RUN groupadd -r app && useradd -r -g app app
WORKDIR /app
COPY --from=deps /venv /venv
ENV PATH="/venv/bin:$PATH"
COPY --chown=app:app . .
USER app
EXPOSE 8000
# In production, migrations run in a separate CI/CD step before deployment.
# For this demo, alembic upgrade head runs at startup using committed migration files.
CMD ["sh", "-c", "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000"]

# Dev target: same deps, uvicorn --reload, source bind-mounted at runtime.
FROM deps AS dev
WORKDIR /app
COPY . .
EXPOSE 8000
CMD ["sh", "-c", "alembic upgrade head && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"]
