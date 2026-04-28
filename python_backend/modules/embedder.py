"""
embedder.py - Embedding Module
다양한 임베딩 모델 지원
"""

from typing import List, Literal, Optional
import numpy as np


class Embedder:
    """텍스트 임베딩을 수행하는 클래스"""

    def __init__(
        self,
        model: Literal["openai", "openai-large", "cohere", "local"] = "openai",
        api_key: Optional[str] = None
    ):
        self.model = model
        self.api_key = api_key
        self._embeddings = None

    def _get_embeddings(self):
        """임베딩 모델 초기화"""
        if self._embeddings is not None:
            return self._embeddings

        if self.model == "openai":
            from langchain_openai import OpenAIEmbeddings
            self._embeddings = OpenAIEmbeddings(
                model="text-embedding-3-small",
                openai_api_key=self.api_key
            )
        elif self.model == "openai-large":
            from langchain_openai import OpenAIEmbeddings
            self._embeddings = OpenAIEmbeddings(
                model="text-embedding-3-large",
                openai_api_key=self.api_key
            )
        elif self.model == "cohere":
            from langchain_community.embeddings import CohereEmbeddings
            self._embeddings = CohereEmbeddings(
                model="embed-multilingual-v3.0",
                cohere_api_key=self.api_key
            )
        elif self.model == "local":
            from langchain_community.embeddings import HuggingFaceEmbeddings
            self._embeddings = HuggingFaceEmbeddings(
                model_name="BAAI/bge-m3",
                model_kwargs={"device": "cpu"},
                encode_kwargs={"normalize_embeddings": True}
            )
        else:
            raise ValueError(f"Unknown model: {self.model}")

        return self._embeddings

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """
        텍스트 리스트를 임베딩

        Args:
            texts: 임베딩할 텍스트 리스트

        Returns:
            임베딩 벡터 리스트
        """
        embeddings = self._get_embeddings()
        return embeddings.embed_documents(texts)

    def embed_query(self, query: str) -> List[float]:
        """
        쿼리 텍스트를 임베딩

        Args:
            query: 쿼리 텍스트

        Returns:
            임베딩 벡터
        """
        embeddings = self._get_embeddings()
        return embeddings.embed_query(query)

    def get_dimension(self) -> int:
        """임베딩 차원 반환"""
        dimensions = {
            "openai": 1536,
            "openai-large": 3072,
            "cohere": 1024,
            "local": 1024
        }
        return dimensions.get(self.model, 1536)

    @staticmethod
    def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
        """코사인 유사도 계산"""
        a = np.array(vec1)
        b = np.array(vec2)
        return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


class MockEmbedder:
    """테스트용 가짜 임베딩 (API 키 없을 때 사용)"""

    def __init__(self, dimension: int = 1536):
        self.dimension = dimension

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """텍스트 해시 기반 가짜 임베딩 생성"""
        result = []
        for text in texts:
            # 텍스트 해시를 시드로 사용하여 일관된 벡터 생성
            np.random.seed(hash(text) % (2**32))
            vec = np.random.randn(self.dimension).tolist()
            # 정규화
            norm = np.linalg.norm(vec)
            vec = [v / norm for v in vec]
            result.append(vec)
        return result

    def embed_query(self, query: str) -> List[float]:
        """쿼리 임베딩"""
        return self.embed_texts([query])[0]

    def get_dimension(self) -> int:
        return self.dimension


def get_embedder(
    model: str = "openai",
    api_key: Optional[str] = None,
    use_mock: bool = False
):
    """
    임베딩 모델 팩토리 함수

    Args:
        model: 모델 종류
        api_key: API 키
        use_mock: 테스트 모드 여부

    Returns:
        Embedder 또는 MockEmbedder 인스턴스
    """
    if use_mock or not api_key:
        return MockEmbedder()
    return Embedder(model=model, api_key=api_key)
