"""
retriever.py - Retriever Module
BM25, Vector, Hybrid 검색 전략
"""

from typing import List, Dict, Any, Optional, Literal
from langchain_core.documents import Document


class BM25Retriever:
    """BM25 키워드 기반 검색"""

    def __init__(self, documents: List[str], k: int = 3, use_kiwi: bool = True):
        self.documents = documents
        self.k = k
        self.use_kiwi = use_kiwi
        self._retriever = None
        self._init_retriever()

    def _init_retriever(self):
        """BM25 리트리버 초기화"""
        from langchain_community.retrievers import BM25Retriever as LangchainBM25

        docs = [Document(page_content=text) for text in self.documents]

        if self.use_kiwi:
            try:
                from kiwipiepy import Kiwi
                kiwi = Kiwi()

                def kiwi_tokenize(text: str):
                    return [token.form for token in kiwi.tokenize(text)]

                self._retriever = LangchainBM25.from_documents(
                    docs, k=self.k, preprocess_func=kiwi_tokenize
                )
            except ImportError:
                # Kiwi 없으면 기본 토크나이저 사용
                self._retriever = LangchainBM25.from_documents(docs, k=self.k)
        else:
            self._retriever = LangchainBM25.from_documents(docs, k=self.k)

    def retrieve(self, query: str) -> List[Dict[str, Any]]:
        """검색 수행"""
        results = self._retriever.invoke(query)
        return [{
            "text": doc.page_content,
            "score": 1.0 - (i * 0.1),  # BM25는 스코어 반환 안하므로 순위 기반 점수
            "metadata": doc.metadata,
            "method": "bm25"
        } for i, doc in enumerate(results)]


class VectorRetriever:
    """벡터 유사도 기반 검색"""

    def __init__(self, vector_store, k: int = 3, search_type: str = "similarity"):
        self.vector_store = vector_store
        self.k = k
        self.search_type = search_type

    def retrieve(self, query: str) -> List[Dict[str, Any]]:
        """검색 수행"""
        if self.search_type == "mmr":
            results = self.vector_store.mmr_search(query, k=self.k)
        else:
            results = self.vector_store.similarity_search(query, k=self.k)

        for r in results:
            r["method"] = f"vector_{self.search_type}"

        return results


class HybridRetriever:
    """BM25 + Vector 하이브리드 검색"""

    def __init__(
        self,
        documents: List[str],
        vector_store,
        k: int = 3,
        bm25_weight: float = 0.5,
        use_kiwi: bool = True
    ):
        self.k = k
        self.bm25_weight = bm25_weight
        self.vector_weight = 1 - bm25_weight

        self.bm25 = BM25Retriever(documents, k=k * 2, use_kiwi=use_kiwi)
        self.vector = VectorRetriever(vector_store, k=k * 2)

    def retrieve(self, query: str) -> List[Dict[str, Any]]:
        """하이브리드 검색 수행"""
        bm25_results = self.bm25.retrieve(query)
        vector_results = self.vector.retrieve(query)

        # 결과 병합 및 점수 재계산
        combined = {}

        for r in bm25_results:
            key = r["text"][:100]  # 텍스트 앞부분으로 키 생성
            combined[key] = {
                "text": r["text"],
                "bm25_score": r["score"],
                "vector_score": 0.0,
                "metadata": r["metadata"]
            }

        for r in vector_results:
            key = r["text"][:100]
            if key in combined:
                combined[key]["vector_score"] = r["score"]
            else:
                combined[key] = {
                    "text": r["text"],
                    "bm25_score": 0.0,
                    "vector_score": r["score"],
                    "metadata": r["metadata"]
                }

        # 최종 점수 계산
        results = []
        for item in combined.values():
            final_score = (
                item["bm25_score"] * self.bm25_weight +
                item["vector_score"] * self.vector_weight
            )
            results.append({
                "text": item["text"],
                "score": final_score,
                "bm25_score": item["bm25_score"],
                "vector_score": item["vector_score"],
                "metadata": item["metadata"],
                "method": "hybrid"
            })

        # 점수 순 정렬 후 상위 k개 반환
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:self.k]


class RetrieverFactory:
    """리트리버 팩토리"""

    @staticmethod
    def create(
        method: Literal["similarity", "mmr", "bm25", "hybrid"],
        documents: Optional[List[str]] = None,
        vector_store=None,
        k: int = 3,
        **kwargs
    ):
        """
        리트리버 생성

        Args:
            method: 검색 방식
            documents: 문서 리스트 (BM25/Hybrid용)
            vector_store: 벡터 저장소 (Vector/Hybrid용)
            k: 반환할 문서 수
            **kwargs: 추가 옵션

        Returns:
            리트리버 인스턴스
        """
        if method == "bm25":
            if not documents:
                raise ValueError("BM25 requires documents")
            return BM25Retriever(documents, k=k, use_kiwi=kwargs.get("use_kiwi", True))

        elif method in ["similarity", "mmr"]:
            if not vector_store:
                raise ValueError("Vector retriever requires vector_store")
            return VectorRetriever(vector_store, k=k, search_type=method)

        elif method == "hybrid":
            if not documents or not vector_store:
                raise ValueError("Hybrid retriever requires both documents and vector_store")
            return HybridRetriever(
                documents, vector_store, k=k,
                bm25_weight=kwargs.get("bm25_weight", 0.5),
                use_kiwi=kwargs.get("use_kiwi", True)
            )

        else:
            raise ValueError(f"Unknown retriever method: {method}")


class SimpleRetriever:
    """간단한 리트리버 (테스트/데모용)"""

    def __init__(
        self,
        chunks: List[Dict[str, Any]],
        embeddings: List[List[float]],
        embedder
    ):
        self.chunks = chunks
        self.embeddings = embeddings
        self.embedder = embedder

    def retrieve(
        self,
        query: str,
        k: int = 3,
        method: str = "similarity"
    ) -> List[Dict[str, Any]]:
        """검색 수행"""
        import numpy as np

        query_emb = self.embedder.embed_query(query)
        query_arr = np.array(query_emb)

        # 모든 청크와 유사도 계산
        scores = []
        for emb in self.embeddings:
            emb_arr = np.array(emb)
            score = np.dot(query_arr, emb_arr) / (
                np.linalg.norm(query_arr) * np.linalg.norm(emb_arr)
            )
            scores.append(float(score))

        # 상위 k개 선택
        if method == "mmr":
            # MMR: 다양성 고려
            selected = self._mmr_select(query_arr, scores, k)
        else:
            # 유사도 순
            selected = np.argsort(scores)[-k:][::-1]

        return [{
            "chunk_id": int(idx),
            "text": self.chunks[idx]["text"],
            "score": scores[idx],
            "length": self.chunks[idx].get("length", len(self.chunks[idx]["text"]))
        } for idx in selected]

    def _mmr_select(
        self,
        query_emb: "np.ndarray",
        scores: List[float],
        k: int,
        lambda_mult: float = 0.5
    ) -> List[int]:
        """MMR 선택 알고리즘"""
        import numpy as np

        selected = []
        candidates = list(range(len(scores)))

        while len(selected) < k and candidates:
            best_idx = None
            best_score = -float("inf")

            for idx in candidates:
                # 관련성 점수
                relevance = scores[idx]

                # 다양성 점수 (이미 선택된 문서들과의 최대 유사도)
                if selected:
                    max_sim = max(
                        np.dot(
                            np.array(self.embeddings[idx]),
                            np.array(self.embeddings[s])
                        ) / (
                            np.linalg.norm(self.embeddings[idx]) *
                            np.linalg.norm(self.embeddings[s])
                        )
                        for s in selected
                    )
                else:
                    max_sim = 0

                # MMR 점수
                mmr_score = lambda_mult * relevance - (1 - lambda_mult) * max_sim

                if mmr_score > best_score:
                    best_score = mmr_score
                    best_idx = idx

            if best_idx is not None:
                selected.append(best_idx)
                candidates.remove(best_idx)

        return selected
