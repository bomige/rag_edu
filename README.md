# RAG Playground

시각적 노드 기반 RAG(Retrieval-Augmented Generation) 학습 플랫폼

## 스크린샷

```
┌─────────────────────────────────────────────────────────────────┐
│  RAG Playground          [가이드모드] [자유모드] [비교모드]    [Run] │
├─────────┬───────────────────────────────────────┬───────────────┤
│         │                                       │               │
│  노드    │     ┌─────────┐    ┌─────────┐       │   Settings    │
│  팔레트  │     │  PDF    │───▶│ Chunking│       │   ─────────   │
│         │     │ Loader  │    │         │       │   Result      │
│  Data   │     └─────────┘    └────┬────┘       │   Logs        │
│  Chunk  │                         │            │   Tip         │
│  Embed  │     ┌─────────┐    ┌────▼────┐       │               │
│  Retrie │     │Embedding│◀───│Retriever│       │               │
│  LLM    │     └────┬────┘    └─────────┘       │               │
│         │          │                           │               │
│         │     ┌────▼────┐                      │               │
│         │     │   LLM   │                      │               │
│         │     └─────────┘                      │               │
├─────────┴───────────────────────────────────────┴───────────────┤
│  결과 뷰어                                                       │
└─────────────────────────────────────────────────────────────────┘
```

## 폴더 구조

```
html_version/
├── index.html              # 메인 HTML 파일
├── css/                    # 스타일시트
│   ├── base.css           # CSS 변수, 리셋
│   ├── layout.css         # 전체 레이아웃
│   ├── components.css     # 버튼, 입력 등 공통 컴포넌트
│   ├── header.css         # 헤더 영역
│   ├── palette.css        # 좌측 노드 팔레트
│   ├── canvas.css         # 캔버스, 노드, 연결선
│   ├── panels.css         # 우측/하단 패널
│   └── modal.css          # 모달 다이얼로그
├── js/                     # JavaScript
│   ├── config.js          # 설정값, 노드 정의
│   ├── api.js             # 백엔드 API 통신
│   ├── state.js           # 전역 상태 관리
│   ├── nodes.js           # 노드 생성/렌더링
│   ├── palette.js         # 노드 팔레트 UI
│   ├── connections.js     # 노드 연결선 관리
│   ├── canvas.js          # 캔버스 드래그/줌
│   ├── panels.js          # 우측 패널 (설정/결과)
│   ├── nodeRunner.js      # 개별 노드 실행
│   ├── pipeline.js        # 전체 파이프라인 실행
│   └── app.js             # 앱 초기화
└── python_backend/         # FastAPI 백엔드
    ├── main.py            # 서버 진입점
    ├── requirements.txt   # Python 의존성
    ├── run.bat            # Windows 실행 스크립트
    ├── run.sh             # Linux/Mac 실행 스크립트
    ├── api/
    │   └── routes.py      # API 엔드포인트
    └── modules/
        ├── data_loader.py # PDF/Web/Text 로딩
        ├── chunker.py     # 텍스트 청킹
        ├── embedder.py    # 임베딩 생성
        ├── vector_store.py# 벡터 저장소
        ├── retriever.py   # 문서 검색
        ├── llm.py         # LLM 응답 생성
        └── evaluator.py   # RAG 성능 평가
```

## 실행 방법

### 1. Python 백엔드 실행

```bash
cd python_backend

# 가상환경 생성 (선택)
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 의존성 설치
pip install -r requirements.txt

# 서버 실행
python main.py
# 또는
# Windows: run.bat
# Linux/Mac: ./run.sh
```

백엔드 서버: `http://localhost:8523`

### 2. 프론트엔드 실행

```bash
# html_version 폴더에서
python -m http.server 8080
```

브라우저: `http://localhost:8080`

### VS Code Live Server 사용 시
- `index.html` 우클릭 → "Open with Live Server"

## 주요 기능

### 노드 기반 파이프라인 편집
- 드래그 앤 드롭으로 노드 추가
- 노드 간 연결선으로 데이터 흐름 정의
- 개별 노드 실행 (▶ 버튼) 또는 전체 파이프라인 실행

### 지원 노드 타입

| 카테고리 | 노드 | 설명 |
|---------|------|------|
| Data | PDF Loader | PDF 파일에서 텍스트 추출 |
| Data | Web Loader | 웹 페이지 크롤링 |
| Data | Text Input | 직접 텍스트 입력 |
| Chunking | Recursive | 재귀적 텍스트 분할 |
| Chunking | Semantic | 의미 기반 분할 |
| Embedding | OpenAI | text-embedding-3-small |
| Retriever | Similarity | 코사인 유사도 검색 |
| Retriever | MMR | 다양성 고려 검색 |
| Retriever | Hybrid | BM25 + 벡터 결합 |
| LLM | GPT-4o | OpenAI GPT-4o |
| LLM | GPT-4o-mini | 경량 모델 |

### 실행 모드
- **테스트 샘플**: API 키 없이 샘플 데이터로 시뮬레이션
- **실제 API**: OpenAI API 키 입력 시 실제 임베딩/LLM 호출

## API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| POST | `/api/load/pdf` | PDF 파일 업로드 및 텍스트 추출 |
| POST | `/api/load/web` | 웹 페이지 크롤링 |
| POST | `/api/load/text` | 텍스트 직접 로드 |
| GET | `/api/load/sample/{name}` | 샘플 데이터 로드 |
| POST | `/api/chunk` | 텍스트 청킹 |
| POST | `/api/embed` | 임베딩 생성 |
| POST | `/api/retrieve` | 문서 검색 |
| POST | `/api/generate` | LLM 응답 생성 |
| POST | `/api/pipeline/run` | 전체 파이프라인 실행 |
| GET | `/api/health` | 서버 상태 확인 |

## 기술 스택

### 프론트엔드
- 순수 HTML/CSS/JavaScript (프레임워크 없음)
- PDF.js (클라이언트 PDF 파싱 폴백)

### 백엔드
- FastAPI
- LangChain (문서 로딩, 청킹)
- OpenAI API (임베딩, LLM)
- pdfplumber / PyMuPDF / PyPDF (PDF 파싱)

## 환경 변수

`python_backend/.env` 파일 생성:

```env
OPENAI_API_KEY=sk-...
```

또는 브라우저에서 설정 모달을 통해 API 키 입력

## 특징

- **서버 없이도 동작**: 백엔드 연결 실패 시 클라이언트에서 시뮬레이션
- **실시간 결과 미리보기**: 각 노드 실행 결과를 우측 패널에서 확인
- **연결된 노드 체인 실행**: 노드 실행 시 선행 노드들도 자동 실행
- **다양한 PDF 파서 지원**: pdfplumber → PyMuPDF → PyPDF 순차 시도
- **프로젝트 저장/로드**: 로컬스토리지 또는 서버에 파이프라인 저장
