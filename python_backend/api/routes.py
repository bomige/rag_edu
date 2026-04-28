"""
routes.py - API Routes
모든 RAG 파이프라인 엔드포인트
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import json
import os
from pathlib import Path

from modules.data_loader import DataLoader, SAMPLE_DOCUMENTS
from modules.chunker import Chunker
from modules.embedder import get_embedder
from modules.vector_store import InMemoryVectorStore
from modules.retriever import SimpleRetriever
from modules.llm import get_llm, PROMPT_TEMPLATES
from modules.evaluator import get_evaluator

router = APIRouter()

# 전역 상태 (세션별로 관리해야 하지만 단순화)
_session_data = {
    "documents": [],
    "chunks": [],
    "embeddings": [],
    "vector_store": InMemoryVectorStore()
}


# ============ Request/Response Models ============

class TextInput(BaseModel):
    text: str
    metadata: Optional[Dict[str, Any]] = None


class WebInput(BaseModel):
    url: str
    parse_class: Optional[str] = None


class ChunkRequest(BaseModel):
    text: str
    chunk_size: int = 500
    chunk_overlap: int = 50
    method: str = "recursive"
    separators: Optional[List[str]] = None


class EmbedRequest(BaseModel):
    texts: List[str]
    model: str = "openai"
    api_key: Optional[str] = None


class RetrieveRequest(BaseModel):
    query: str
    top_k: int = 3
    method: str = "similarity"  # similarity, mmr, bm25, hybrid
    api_key: Optional[str] = None


class GenerateRequest(BaseModel):
    query: str
    context: List[str]
    model: str = "gpt-4o"
    temperature: float = 0.7
    prompt_template: Optional[str] = None
    api_key: Optional[str] = None


class EvaluateRequest(BaseModel):
    query: str
    answer: str
    contexts: List[str]
    ground_truth: Optional[str] = None
    api_key: Optional[str] = None


class PipelineRequest(BaseModel):
    """전체 파이프라인 실행 요청"""
    query: str
    text: Optional[str] = None
    chunk_size: int = 500
    chunk_overlap: int = 50
    chunk_method: str = "recursive"
    embedding_model: str = "openai"
    retriever_method: str = "similarity"
    top_k: int = 3
    llm_model: str = "gpt-4o"
    temperature: float = 0.7
    api_key: Optional[str] = None


class ProjectSaveRequest(BaseModel):
    project_id: str
    name: str
    nodes: List[Dict[str, Any]]
    connections: List[Dict[str, Any]]
    settings: Optional[Dict[str, Any]] = None


# ============ Data Loading Endpoints ============

@router.post("/load/text")
async def load_text(input: TextInput):
    """텍스트 직접 로드"""
    try:
        documents = DataLoader.load_text(input.text, input.metadata)
        _session_data["documents"] = [doc.page_content for doc in documents]

        full_text = input.text

        return {
            "success": True,
            "text": full_text,  # 전체 텍스트 반환
            "document_count": len(documents),
            "total_chars": len(full_text),
            "preview": full_text[:500] if full_text else "",
            "metadata": {
                "source": "text_input",
                "char_count": len(full_text)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/load/web")
async def load_web(input: WebInput):
    """웹 페이지 로드"""
    try:
        documents = DataLoader.load_web(input.url, input.parse_class)
        _session_data["documents"] = [doc.page_content for doc in documents]

        # 전체 텍스트 합치기
        full_text = "\n\n".join(doc.page_content for doc in documents)

        return {
            "success": True,
            "text": full_text,  # 전체 텍스트 반환
            "document_count": len(documents),
            "total_chars": len(full_text),
            "preview": full_text[:500] if full_text else "",
            "metadata": {
                "url": input.url,
                "char_count": len(full_text)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/load/pdf")
async def load_pdf(file: UploadFile = File(...)):
    """PDF 파일 로드"""
    try:
        contents = await file.read()
        print(f"[load_pdf] Received file: {file.filename}, size: {len(contents)} bytes")

        documents = DataLoader.load_pdf_from_bytes(contents, file.filename)

        # 디버깅: 각 document 내용 확인
        for i, doc in enumerate(documents):
            content = doc.page_content
            print(f"[load_pdf] Document {i}: {len(content)} chars")
            if content.strip():
                print(f"[load_pdf] Preview: {content[:100]!r}")
            else:
                print(f"[load_pdf] Document {i} is empty or whitespace only")

        # 빈 문서 필터링
        valid_documents = [doc for doc in documents if doc.page_content.strip()]
        print(f"[load_pdf] Valid documents after filtering: {len(valid_documents)} / {len(documents)}")

        _session_data["documents"] = [doc.page_content for doc in valid_documents]

        # 전체 텍스트 합치기 (빈 문서 제외)
        full_text = "\n\n".join(doc.page_content for doc in valid_documents)
        print(f"[load_pdf] Final text length: {len(full_text)}")

        return {
            "success": True,
            "filename": file.filename,
            "text": full_text,  # 전체 텍스트 반환
            "page_count": len(documents),
            "valid_page_count": len(valid_documents),
            "total_chars": len(full_text),
            "preview": full_text[:500] if full_text else "",
            "metadata": {
                "page_count": len(documents),
                "valid_page_count": len(valid_documents),
                "char_count": len(full_text)
            }
        }
    except Exception as e:
        import traceback
        print(f"[load_pdf] Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/load/sample/{sample_name}")
async def load_sample(sample_name: str):
    """샘플 데이터 로드"""
    if sample_name not in SAMPLE_DOCUMENTS:
        raise HTTPException(status_code=404, detail=f"Sample '{sample_name}' not found")

    text = SAMPLE_DOCUMENTS[sample_name]
    _session_data["documents"] = [text]

    return {
        "success": True,
        "text": text,  # 전체 텍스트 반환
        "sample_name": sample_name,
        "total_chars": len(text),
        "preview": text[:500],
        "metadata": {
            "source": "sample",
            "sample_name": sample_name
        }
    }


@router.get("/samples")
async def list_samples():
    """사용 가능한 샘플 목록"""
    return {
        "samples": [
            {"name": name, "chars": len(text), "preview": text[:100]}
            for name, text in SAMPLE_DOCUMENTS.items()
        ]
    }


# ============ Chunking Endpoints ============

@router.post("/chunk")
async def chunk_text(request: ChunkRequest):
    """텍스트 청킹"""
    try:
        chunks = Chunker.chunk_text(
            text=request.text,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap,
            method=request.method,
            separators=request.separators
        )
        _session_data["chunks"] = chunks

        return {
            "success": True,
            "chunk_count": len(chunks),
            "total_chars": len(request.text),
            "avg_chunk_size": sum(c["length"] for c in chunks) / len(chunks) if chunks else 0,
            "chunks": chunks
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chunk/preview")
async def preview_chunks(request: ChunkRequest):
    """청킹 미리보기"""
    try:
        preview = Chunker.preview_chunks(
            text=request.text,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap
        )
        return {"success": True, **preview}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Embedding Endpoints ============

@router.post("/embed")
async def embed_texts(request: EmbedRequest):
    """텍스트 임베딩"""
    try:
        use_mock = not request.api_key
        embedder = get_embedder(
            model=request.model,
            api_key=request.api_key,
            use_mock=use_mock
        )

        embeddings = embedder.embed_texts(request.texts)
        _session_data["embeddings"] = embeddings

        # 벡터 저장소에 추가
        _session_data["vector_store"].clear()
        _session_data["vector_store"].add(
            texts=request.texts,
            embeddings=embeddings
        )

        return {
            "success": True,
            "is_mock": use_mock,
            "text_count": len(request.texts),
            "embedding_dimension": len(embeddings[0]) if embeddings else 0,
            "model": request.model if not use_mock else "mock"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Retrieval Endpoints ============

@router.post("/retrieve")
async def retrieve(request: RetrieveRequest):
    """문서 검색"""
    try:
        chunks = _session_data.get("chunks", [])
        embeddings = _session_data.get("embeddings", [])

        if not chunks:
            raise HTTPException(status_code=400, detail="No chunks available. Run chunking first.")

        use_mock = not request.api_key
        embedder = get_embedder(api_key=request.api_key, use_mock=use_mock)

        if not embeddings:
            # 임베딩이 없으면 생성
            texts = [c["text"] for c in chunks]
            embeddings = embedder.embed_texts(texts)
            _session_data["embeddings"] = embeddings

        retriever = SimpleRetriever(chunks, embeddings, embedder)
        results = retriever.retrieve(
            query=request.query,
            k=request.top_k,
            method=request.method
        )

        return {
            "success": True,
            "is_mock": use_mock,
            "query": request.query,
            "method": request.method,
            "result_count": len(results),
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Generation Endpoints ============

@router.post("/generate")
async def generate(request: GenerateRequest):
    """LLM 응답 생성"""
    try:
        use_mock = not request.api_key
        llm = get_llm(
            model=request.model,
            api_key=request.api_key,
            temperature=request.temperature,
            use_mock=use_mock
        )

        result = llm.generate(
            query=request.query,
            context=request.context,
            system_prompt=request.prompt_template
        )

        return {
            "success": True,
            "is_mock": use_mock,
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/prompts")
async def list_prompts():
    """사용 가능한 프롬프트 템플릿"""
    return {
        "templates": [
            {"name": name, "template": template[:200] + "..."}
            for name, template in PROMPT_TEMPLATES.items()
        ]
    }


# ============ Evaluation Endpoints ============

@router.post("/evaluate")
async def evaluate(request: EvaluateRequest):
    """RAG 응답 평가"""
    try:
        use_mock = not request.api_key
        evaluator = get_evaluator(api_key=request.api_key, use_mock=use_mock)

        result = evaluator.evaluate(
            query=request.query,
            answer=request.answer,
            contexts=request.contexts,
            ground_truth=request.ground_truth
        )

        return {
            "success": True,
            "is_mock": use_mock,
            "scores": {
                "faithfulness": result.faithfulness,
                "relevancy": result.relevancy,
                "context_precision": result.context_precision,
                "context_recall": result.context_recall,
                "answer_similarity": result.answer_similarity,
                "overall_score": result.overall_score
            },
            "details": result.details
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Pipeline Endpoints ============

@router.post("/pipeline/run")
async def run_pipeline(request: PipelineRequest):
    """전체 RAG 파이프라인 실행"""
    try:
        use_mock = not request.api_key
        logs = []
        import time

        start_time = time.time()

        # Step 1: 문서 로드
        logs.append({"step": "load", "status": "running", "message": "문서 로딩 중..."})
        text = request.text or SAMPLE_DOCUMENTS.get("rag_intro", "")
        _session_data["documents"] = [text]
        logs[-1]["status"] = "success"
        logs[-1]["duration"] = int((time.time() - start_time) * 1000)

        # Step 2: 청킹
        step_start = time.time()
        logs.append({"step": "chunk", "status": "running", "message": f"청킹 중... (size={request.chunk_size}, overlap={request.chunk_overlap})"})
        chunks = Chunker.chunk_text(
            text=text,
            chunk_size=request.chunk_size,
            chunk_overlap=request.chunk_overlap,
            method=request.chunk_method
        )
        _session_data["chunks"] = chunks
        logs[-1]["status"] = "success"
        logs[-1]["duration"] = int((time.time() - step_start) * 1000)
        logs[-1]["chunk_count"] = len(chunks)

        # Step 3: 임베딩
        step_start = time.time()
        logs.append({"step": "embed", "status": "running", "message": f"임베딩 생성 중... ({request.embedding_model})"})
        embedder = get_embedder(model=request.embedding_model, api_key=request.api_key, use_mock=use_mock)
        texts = [c["text"] for c in chunks]
        embeddings = embedder.embed_texts(texts)
        _session_data["embeddings"] = embeddings
        logs[-1]["status"] = "success"
        logs[-1]["duration"] = int((time.time() - step_start) * 1000)
        logs[-1]["dimension"] = len(embeddings[0]) if embeddings else 0

        # Step 4: 검색
        step_start = time.time()
        logs.append({"step": "retrieve", "status": "running", "message": f"관련 문서 검색 중... (top_k={request.top_k})"})
        retriever = SimpleRetriever(chunks, embeddings, embedder)
        retrieved = retriever.retrieve(
            query=request.query,
            k=request.top_k,
            method=request.retriever_method
        )
        logs[-1]["status"] = "success"
        logs[-1]["duration"] = int((time.time() - step_start) * 1000)
        logs[-1]["retrieved_count"] = len(retrieved)

        # Step 5: 생성
        step_start = time.time()
        logs.append({"step": "generate", "status": "running", "message": f"응답 생성 중... ({request.llm_model})"})
        llm = get_llm(model=request.llm_model, api_key=request.api_key, temperature=request.temperature, use_mock=use_mock)
        context = [r["text"] for r in retrieved]
        generation_result = llm.generate(query=request.query, context=context)
        logs[-1]["status"] = "success"
        logs[-1]["duration"] = int((time.time() - step_start) * 1000)

        total_time = time.time() - start_time

        return {
            "success": True,
            "is_mock": use_mock,
            "query": request.query,
            "answer": generation_result["answer"],
            "retrieved_chunks": retrieved,
            "chunk_count": len(chunks),
            "logs": logs,
            "total_time": round(total_time, 2),
            "token_count": generation_result.get("usage", {}).get("prompt_tokens", 0) + generation_result.get("usage", {}).get("completion_tokens", 0),
            "estimated_cost": round(0.01 + total_time * 0.001, 4)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Project Management Endpoints ============

PROJECTS_DIR = Path(__file__).parent.parent / "data" / "projects"


@router.post("/project/save")
async def save_project(request: ProjectSaveRequest):
    """프로젝트 저장"""
    try:
        PROJECTS_DIR.mkdir(parents=True, exist_ok=True)

        project_data = {
            "id": request.project_id,
            "name": request.name,
            "nodes": request.nodes,
            "connections": request.connections,
            "settings": request.settings or {}
        }

        file_path = PROJECTS_DIR / f"{request.project_id}.json"
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(project_data, f, ensure_ascii=False, indent=2)

        return {
            "success": True,
            "project_id": request.project_id,
            "message": "프로젝트가 저장되었습니다."
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/project/load/{project_id}")
async def load_project(project_id: str):
    """프로젝트 로드"""
    try:
        file_path = PROJECTS_DIR / f"{project_id}.json"
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

        with open(file_path, "r", encoding="utf-8") as f:
            project_data = json.load(f)

        return {
            "success": True,
            **project_data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/project/delete/{project_id}")
async def delete_project(project_id: str):
    """프로젝트 삭제"""
    try:
        file_path = PROJECTS_DIR / f"{project_id}.json"
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="프로젝트를 찾을 수 없습니다.")

        os.remove(file_path)

        return {
            "success": True,
            "message": "프로젝트가 삭제되었습니다."
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/projects")
async def list_projects():
    """프로젝트 목록"""
    try:
        PROJECTS_DIR.mkdir(parents=True, exist_ok=True)

        projects = []
        for file_path in PROJECTS_DIR.glob("*.json"):
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                projects.append({
                    "id": data.get("id"),
                    "name": data.get("name"),
                    "node_count": len(data.get("nodes", [])),
                    "connection_count": len(data.get("connections", []))
                })

        return {
            "success": True,
            "projects": projects
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Session Management ============

@router.post("/session/clear")
async def clear_session():
    """세션 데이터 초기화"""
    _session_data["documents"] = []
    _session_data["chunks"] = []
    _session_data["embeddings"] = []
    _session_data["vector_store"].clear()

    return {"success": True, "message": "세션이 초기화되었습니다."}


@router.get("/session/status")
async def session_status():
    """현재 세션 상태"""
    return {
        "document_count": len(_session_data["documents"]),
        "chunk_count": len(_session_data["chunks"]),
        "embedding_count": len(_session_data["embeddings"]),
        "has_vector_store": len(_session_data["vector_store"].documents) > 0
    }
