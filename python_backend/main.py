"""
main.py - FastAPI Server
RAG Playground 백엔드 서버
"""

import os
import sys
from pathlib import Path

# 모듈 경로 추가
sys.path.insert(0, str(Path(__file__).parent))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from dotenv import load_dotenv

from api.routes import router as api_router

# .env 파일 로드
load_dotenv()

# FastAPI 앱 생성
app = FastAPI(
    title="RAG Playground API",
    description="RAG 파이프라인 학습 및 실험을 위한 백엔드 API",
    version="1.0.0"
)

# CORS 설정 (프론트엔드에서 접근 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 개발 환경에서는 모두 허용
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 라우터 등록
app.include_router(api_router, prefix="/api")

# 정적 파일 서빙 (프론트엔드)
FRONTEND_DIR = Path(__file__).parent.parent
if (FRONTEND_DIR / "index.html").exists():
    app.mount("/css", StaticFiles(directory=FRONTEND_DIR / "css"), name="css")
    app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")

    @app.get("/")
    async def serve_frontend():
        """프론트엔드 메인 페이지"""
        return FileResponse(FRONTEND_DIR / "index.html")


@app.get("/api")
async def api_root():
    """API 루트"""
    return {
        "message": "RAG Playground API",
        "version": "1.0.0",
        "endpoints": {
            "data_loading": [
                "POST /api/load/text",
                "POST /api/load/web",
                "POST /api/load/pdf",
                "GET /api/load/sample/{sample_name}",
                "GET /api/samples"
            ],
            "chunking": [
                "POST /api/chunk",
                "POST /api/chunk/preview"
            ],
            "embedding": [
                "POST /api/embed"
            ],
            "retrieval": [
                "POST /api/retrieve"
            ],
            "generation": [
                "POST /api/generate",
                "GET /api/prompts"
            ],
            "evaluation": [
                "POST /api/evaluate"
            ],
            "pipeline": [
                "POST /api/pipeline/run"
            ],
            "project": [
                "POST /api/project/save",
                "GET /api/project/load/{project_id}",
                "DELETE /api/project/delete/{project_id}",
                "GET /api/projects"
            ],
            "session": [
                "POST /api/session/clear",
                "GET /api/session/status"
            ]
        }
    }


@app.get("/health")
async def health_check():
    """헬스 체크"""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn

    print("=" * 50)
    print("RAG Playground Backend Server")
    print("=" * 50)
    print(f"Frontend: http://localhost:8523")
    print(f"API Docs: http://localhost:8523/docs")
    print(f"ReDoc: http://localhost:8523/redoc")
    print("=" * 50)

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8523,
        reload=True,
        reload_dirs=[str(Path(__file__).parent)]
    )
