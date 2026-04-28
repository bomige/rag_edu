"""
data_loader.py - Document Loading Module
PDF, Web, Text 등 다양한 소스에서 문서 로드
"""

import os
import tempfile
from typing import List, Optional
from pathlib import Path

from langchain_core.documents import Document


class DataLoader:
    """다양한 소스에서 문서를 로드하는 클래스"""

    @staticmethod
    def load_text(text: str, metadata: Optional[dict] = None) -> List[Document]:
        """텍스트를 직접 Document로 변환"""
        return [Document(
            page_content=text,
            metadata=metadata or {"source": "direct_input"}
        )]

    @staticmethod
    def load_pdf(file_path: str) -> List[Document]:
        """PDF 파일 로드 - 여러 방법 시도"""
        documents = []

        # 방법 1: pdfplumber 시도 (가장 안정적)
        try:
            import pdfplumber
            print(f"[PDF Loader] Trying pdfplumber for: {file_path}")
            with pdfplumber.open(file_path) as pdf:
                print(f"[PDF Loader] Total pages in PDF: {len(pdf.pages)}")
                for i, page in enumerate(pdf.pages):
                    text = page.extract_text() or ""
                    print(f"[PDF Loader] Page {i+1}: {len(text)} chars, stripped: {len(text.strip())} chars")
                    if text.strip():
                        print(f"[PDF Loader] Page {i+1} preview: {text[:100]!r}")
                        documents.append(Document(
                            page_content=text.strip(),  # strip으로 앞뒤 공백 제거
                            metadata={"page": i + 1, "source": file_path}
                        ))
                    else:
                        print(f"[PDF Loader] Page {i+1} is empty, skipping")
            if documents:
                print(f"[PDF Loader] pdfplumber extracted {len(documents)} valid pages")
                return documents
            else:
                print("[PDF Loader] pdfplumber found no text content, trying other methods")
        except ImportError:
            print("[PDF Loader] pdfplumber not installed")
        except Exception as e:
            import traceback
            print(f"[PDF Loader] pdfplumber error: {e}")
            traceback.print_exc()

        # 방법 2: PyMuPDF 시도
        try:
            from langchain_community.document_loaders import PyMuPDFLoader
            print(f"[PDF Loader] Trying PyMuPDF for: {file_path}")
            loader = PyMuPDFLoader(file_path)
            loaded_docs = loader.load()
            print(f"[PDF Loader] PyMuPDF loaded {len(loaded_docs)} pages")

            # 빈 페이지 필터링
            documents = []
            for i, doc in enumerate(loaded_docs):
                content = doc.page_content.strip()
                print(f"[PDF Loader] PyMuPDF Page {i+1}: {len(content)} chars")
                if content:
                    print(f"[PDF Loader] PyMuPDF Page {i+1} preview: {content[:100]!r}")
                    doc.page_content = content
                    documents.append(doc)

            if documents:
                print(f"[PDF Loader] PyMuPDF extracted {len(documents)} valid pages")
                return documents
            else:
                print("[PDF Loader] PyMuPDF found no text content, trying other methods")
        except ImportError:
            print("[PDF Loader] PyMuPDF not installed")
        except Exception as e:
            import traceback
            print(f"[PDF Loader] PyMuPDF error: {e}")
            traceback.print_exc()

        # 방법 3: pypdf 시도
        try:
            from langchain_community.document_loaders import PyPDFLoader
            print(f"[PDF Loader] Trying PyPDF for: {file_path}")
            loader = PyPDFLoader(file_path)
            loaded_docs = loader.load()
            print(f"[PDF Loader] PyPDF loaded {len(loaded_docs)} pages")

            # 빈 페이지 필터링
            documents = []
            for i, doc in enumerate(loaded_docs):
                content = doc.page_content.strip()
                print(f"[PDF Loader] PyPDF Page {i+1}: {len(content)} chars")
                if content:
                    print(f"[PDF Loader] PyPDF Page {i+1} preview: {content[:100]!r}")
                    doc.page_content = content
                    documents.append(doc)

            if documents:
                print(f"[PDF Loader] PyPDF extracted {len(documents)} valid pages")
                return documents
            else:
                print("[PDF Loader] PyPDF found no text content")
        except ImportError:
            print("[PDF Loader] PyPDF not installed")
        except Exception as e:
            import traceback
            print(f"[PDF Loader] PyPDF error: {e}")
            traceback.print_exc()

        # 모든 방법 실패시 - 이미지 기반 PDF일 수 있음
        print("[PDF Loader] All methods failed - PDF may be image-based or encrypted")
        return [Document(
            page_content="[PDF 텍스트 추출 실패]\n\n이 PDF는 텍스트를 추출할 수 없습니다.\n- 이미지 기반 PDF일 수 있습니다 (OCR 필요)\n- 암호화된 PDF일 수 있습니다\n- 손상된 파일일 수 있습니다",
            metadata={"error": True, "reason": "no_text_extractable"}
        )]

    @staticmethod
    def load_pdf_from_bytes(file_bytes: bytes, filename: str) -> List[Document]:
        """바이트에서 PDF 로드 (업로드된 파일용)"""
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            tmp.write(file_bytes)
            tmp_path = tmp.name

        try:
            documents = DataLoader.load_pdf(tmp_path)
            # 메타데이터에 원본 파일명 추가
            for doc in documents:
                doc.metadata['original_filename'] = filename
            return documents
        finally:
            os.unlink(tmp_path)

    @staticmethod
    def load_web(url: str, parse_class: Optional[str] = None) -> List[Document]:
        """웹 페이지 로드"""
        from langchain_community.document_loaders import WebBaseLoader
        import bs4

        if parse_class:
            # 특정 클래스만 파싱
            loader = WebBaseLoader(
                web_paths=[url],
                bs_kwargs=dict(
                    parse_only=bs4.SoupStrainer("div", attrs={"class": parse_class})
                ),
                header_template={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            )
        else:
            loader = WebBaseLoader(
                web_paths=[url],
                header_template={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            )

        return loader.load()

    @staticmethod
    def load_multiple_urls(urls: List[str]) -> List[Document]:
        """여러 URL 로드"""
        from langchain_community.document_loaders import WebBaseLoader

        loader = WebBaseLoader(
            web_paths=urls,
            header_template={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        )
        return loader.load()


# 샘플 데이터 (테스트용)
SAMPLE_DOCUMENTS = {
    "rag_intro": """RAG(Retrieval-Augmented Generation)는 대규모 언어 모델(LLM)의 성능을 향상시키기 위한 기술입니다.

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
- 검색 방식: Similarity, MMR(다양성 고려), Hybrid(키워드+의미 결합)""",

    "policy_support": """청년 주거 안정을 위한 월세 지원 제도가 확대되었습니다. 만 19세에서 34세 청년에게 월 최대 20만원을 지원합니다.

저출산 대책으로 출산 지원금이 인상되었습니다. 첫째 200만원, 둘째 300만원, 셋째 500만원을 지급합니다.

노인 일자리 창출 사업이 시작됩니다. 만 65세 이상 노인에게 사회공헌형 일자리를 제공하고 월 27만원을 지급합니다.

기초생활수급자 생계비가 인상됩니다. 1인 가구 기준 월 62만원에서 65만원으로 상향 조정되었습니다.

청년 취업 지원 프로그램이 강화됩니다. 직업훈련비와 취업 성공 수당을 최대 300만원까지 지원합니다.

한부모 가정 양육비 지원이 확대됩니다. 자녀 1인당 월 20만원을 지원하며 만 18세까지 받을 수 있습니다."""
}
