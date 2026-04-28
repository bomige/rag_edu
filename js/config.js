/**
 * config.js - Configuration and Constants
 */

const CONFIG = {
  // Canvas settings
  canvas: {
    nodeWidth: 200,
    nodeHeight: 120,
    gridSize: 20,
    minZoom: 50,
    maxZoom: 150,
    zoomStep: 10
  },

  // Default parameters
  defaults: {
    chunkSize: 500,
    chunkOverlap: 50,
    topK: 3,
    temperature: 0.7
  },

  // Animation durations (ms)
  animation: {
    toast: 3000,
    nodeStatus: 500,
    pipelineStep: 500
  }
};

// Node category colors
const NODE_COLORS = {
  data: '#22c55e',
  chunking: '#f97316',
  embedding: '#8b5cf6',
  vector: '#06b6d4',
  retriever: '#3b82f6',
  similarity: '#ec4899',
  prompt: '#eab308',
  llm: '#ef4444',
  eval: '#14b8a6',
  chain: '#6366f1',
  flow: '#a855f7'
};

// Node categories with their nodes
const NODE_CATEGORIES = [
  {
    category: 'data',
    label: 'Data Source',
    icon: 'file-text',
    nodes: [
      { type: 'pdf-loader', name: 'PDF Loader', description: 'PDF 문서 로드' },
      { type: 'web-loader', name: 'Web Loader', description: '웹 페이지 스크래핑' },
      { type: 'text-input', name: 'Text Input', description: '직접 텍스트 입력' }
    ]
  },
  {
    category: 'chunking',
    label: 'Chunking',
    icon: 'scissors',
    nodes: [
      { type: 'recursive-splitter', name: 'Recursive Splitter', description: '재귀적 문자 분할' },
      { type: 'sentence-splitter', name: 'Sentence Splitter', description: '문장 단위 분할' },
      { type: 'semantic-splitter', name: 'Semantic Splitter', description: '의미 기반 분할' }
    ]
  },
  {
    category: 'embedding',
    label: 'Embedding',
    icon: 'sparkles',
    nodes: [
      { type: 'openai-embedding', name: 'OpenAI Embedding', description: 'text-embedding-3-small' },
      { type: 'cohere-embedding', name: 'Cohere Embedding', description: 'embed-multilingual-v3' },
      { type: 'local-embedding', name: 'Local Embedding', description: 'BGE-M3 로컬 모델' }
    ]
  },
  {
    category: 'vector',
    label: 'Vector Store',
    icon: 'database',
    nodes: [
      { type: 'chroma', name: 'Chroma', description: 'Chroma 벡터 DB' },
      { type: 'pinecone', name: 'Pinecone', description: 'Pinecone 클라우드' },
      { type: 'faiss', name: 'FAISS', description: 'FAISS 로컬 인덱스' }
    ]
  },
  {
    category: 'retriever',
    label: 'Retriever',
    icon: 'search',
    nodes: [
      { type: 'similarity-search', name: 'Similarity Search', description: '유사도 기반 검색' },
      { type: 'mmr', name: 'MMR', description: 'Maximum Marginal Relevance' },
      { type: 'hybrid', name: 'Hybrid Search', description: 'BM25 + Dense 결합' }
    ]
  },
  {
    category: 'prompt',
    label: 'Prompt',
    icon: 'message-square',
    nodes: [
      { type: 'rag-prompt', name: 'RAG Prompt', description: '컨텍스트 기반 프롬프트' },
      { type: 'few-shot', name: 'Few-Shot Prompt', description: '예시 기반 프롬프트' },
      { type: 'cot-prompt', name: 'CoT Prompt', description: 'Chain-of-Thought' }
    ]
  },
  {
    category: 'llm',
    label: 'LLM',
    icon: 'bot',
    nodes: [
      { type: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI GPT-4o' },
      { type: 'claude', name: 'Claude 3.5', description: 'Anthropic Claude' },
      { type: 'gemini', name: 'Gemini Pro', description: 'Google Gemini' }
    ]
  },
  {
    category: 'eval',
    label: 'Evaluation',
    icon: 'bar-chart',
    nodes: [
      { type: 'ragas', name: 'RAGAS', description: '종합 RAG 평가' },
      { type: 'faithfulness', name: 'Faithfulness', description: '충실도 평가' },
      { type: 'relevancy', name: 'Relevancy', description: '관련성 평가' }
    ]
  }
];

// Sample document for demo
const SAMPLE_DOCUMENT = `RAG(Retrieval-Augmented Generation)는 대규모 언어 모델(LLM)의 성능을 향상시키기 위한 기술입니다.

기존 LLM은 학습 데이터에 포함된 정보만을 기반으로 응답을 생성하지만, RAG는 외부 지식 베이스에서 관련 정보를 실시간으로 검색하여 응답 생성에 활용합니다.

RAG의 핵심 구성요소:
1. 문서 로더(Document Loader): PDF, 웹페이지, 텍스트 파일 등 다양한 형식의 문서를 로드합니다.
2. 청킹(Chunking): 긴 문서를 작은 조각으로 분할합니다. chunk_size와 overlap이 중요한 파라미터입니다.
3. 임베딩(Embedding): 텍스트를 고차원 벡터로 변환합니다. OpenAI, Cohere 등의 모델을 사용합니다.
4. 벡터 저장소(Vector Store): 임베딩된 벡터를 저장하고 유사도 검색을 수행합니다.
5. 리트리버(Retriever): 쿼리와 가장 유사한 문서 조각을 검색합니다.
6. 프롬프트(Prompt): 검색된 컨텍스트와 질문을 결합하여 LLM에 전달합니다.
7. LLM: 최종 응답을 생성합니다.

RAG의 장점:
- 환각(Hallucination) 감소: 실제 문서에 기반한 응답 생성
- 최신 정보 반영: 학습 데이터 이후의 정보도 활용 가능
- 출처 제공: 답변의 근거를 명확히 제시할 수 있음
- 도메인 특화: 특정 분야의 전문 지식 활용 가능

RAG 파이프라인 최적화:
- chunk_size: 너무 작으면 컨텍스트 부족, 너무 크면 노이즈 증가
- top_k: 검색할 문서 수, 많을수록 정보량 증가하지만 비용도 증가
- 검색 방식: Similarity, MMR(다양성 고려), Hybrid(키워드+의미 결합)`;

// Sample Q&A pairs
const SAMPLE_QA = [
  {
    question: 'RAG란 무엇인가요?',
    answer: 'RAG(Retrieval-Augmented Generation)는 대규모 언어 모델의 성능을 향상시키기 위해 외부 지식 베이스에서 관련 정보를 검색하여 응답 생성에 활용하는 기술입니다.'
  },
  {
    question: 'RAG의 핵심 구성요소는 무엇인가요?',
    answer: 'RAG의 핵심 구성요소는 문서 로더, 청킹, 임베딩, 벡터 저장소, 리트리버, 프롬프트, LLM입니다.'
  },
  {
    question: '청킹에서 중요한 파라미터는 무엇인가요?',
    answer: '청킹에서 중요한 파라미터는 chunk_size(청크 크기)와 overlap(겹침 영역)입니다.'
  }
];

// Default nodes - 초기에는 빈 캔버스
const DEFAULT_NODES = [];

// Default connections - 초기에는 연결 없음
const DEFAULT_CONNECTIONS = [];
