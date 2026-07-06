from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import ai, areas, commentaries, graph, indicators, meta, results

app = FastAPI(title="Synaptic Strategy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meta.router, prefix="/api", tags=["meta"])
app.include_router(areas.router, prefix="/api", tags=["areas"])
app.include_router(indicators.router, prefix="/api", tags=["indicators"])
app.include_router(results.router, prefix="/api", tags=["results"])
app.include_router(commentaries.router, prefix="/api", tags=["commentaries"])
app.include_router(graph.router, prefix="/api", tags=["graph"])
app.include_router(ai.router, prefix="/api", tags=["ai"])


@app.get("/health")
async def health():
    return {"status": "ok"}
