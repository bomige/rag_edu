"""
vector_store.py - Vector Store Module
ChromaDB, FAISS 등 벡터 저장소 관리
"""

import os
import json
from typing import List, Optional, Literal, Dict, Any
from pathlib import Path

from langchain_core.documents import Document


class VectorStoreManager:
    """벡터 저장소 관리 클래스"""

    def __init__(
        self,
        store_type: Literal["chroma", "faiss", "memory"] = "chroma",
        persist_directory: Optional[str] = None,
        collection_name: str = "default"
    ):
        self.store_type = store_type
        self.persist_directory = persist_directory
        self.collection_name = collection_name
        self._store = None
        self._embeddings = None

    def initialize(self, embeddings):
        """임베딩 모델로 벡터 저장소 초기화"""
        self._embeddings = embeddings

        if self.store_type == "chroma":
            self._init_chroma()
        elif self.store_type == "faiss":
            self._init_faiss()
        else:
            self._init_memory()

    def _init_chroma(self):
        """ChromaDB 초기화"""
        from langchain_community.vectorstores import Chroma

        if self.persist_directory:
            self._store = Chroma(
                collection_name=self.collection_name,
                embedding_function=self._embeddings,
                persist_directory=self.persist_directory
            )
        else:
            self._store = Chroma(
                collection_name=self.collection_name,
                embedding_function=self._embeddings
            )

    def _init_faiss(self):
        """FAISS 초기화"""
        from langchain_community.vectorstores import FAISS

        # FAISS는 빈 상태로 초기화 불가, 나중에 문서 추가 시 생성
        self._store = None

    def _init_memory(self):
        """인메모리 저장소 초기화"""
        self._store = {
            "documents": [],
            "embeddings": [],
            "metadatas": []
        }

    def add_documents(self, documents: List[Document]) -> List[str]:
        """
        문서 추가

        Args:
            documents: 추가할 Document 리스트

        Returns:
            추가된 문서 ID 리스트
        """
        if self.store_type == "chroma":
            return self._store.add_documents(documents)

        elif self.store_type == "faiss":
            from langchain_community.vectorstores import FAISS

            if self._store is None:
                self._store = FAISS.from_documents(documents, self._embeddings)
            else:
                self._store.add_documents(documents)
            return [f"doc_{i}" for i in range(len(documents))]

        else:  # memory
            texts = [doc.page_content for doc in documents]
            embeddings = self._embeddings.embed_documents(texts)

            ids = []
            for i, (doc, emb) in enumerate(zip(documents, embeddings)):
                doc_id = f"doc_{len(self._store['documents']) + i}"
                self._store["documents"].append(doc.page_content)
                self._store["embeddings"].append(emb)
                self._store["metadatas"].append(doc.metadata)
                ids.append(doc_id)
            return ids

    def add_texts(
        self,
        texts: List[str],
        metadatas: Optional[List[dict]] = None
    ) -> List[str]:
        """텍스트 직접 추가"""
        documents = [
            Document(page_content=text, metadata=meta or {})
            for text, meta in zip(texts, metadatas or [{}] * len(texts))
        ]
        return self.add_documents(documents)

    def similarity_search(
        self,
        query: str,
        k: int = 3
    ) -> List[Dict[str, Any]]:
        """
        유사도 검색

        Args:
            query: 검색 쿼리
            k: 반환할 문서 수

        Returns:
            검색 결과 리스트 (text, score, metadata)
        """
        if self.store_type in ["chroma", "faiss"] and self._store:
            results = self._store.similarity_search_with_score(query, k=k)
            return [{
                "text": doc.page_content,
                "score": float(score),
                "metadata": doc.metadata
            } for doc, score in results]

        elif self.store_type == "memory" and self._store["documents"]:
            # 인메모리 유사도 검색
            import numpy as np

            query_emb = self._embeddings.embed_query(query)
            scores = []

            for emb in self._store["embeddings"]:
                # 코사인 유사도
                score = np.dot(query_emb, emb) / (
                    np.linalg.norm(query_emb) * np.linalg.norm(emb)
                )
                scores.append(float(score))

            # 상위 k개 인덱스
            top_indices = np.argsort(scores)[-k:][::-1]

            return [{
                "text": self._store["documents"][i],
                "score": scores[i],
                "metadata": self._store["metadatas"][i]
            } for i in top_indices]

        return []

    def mmr_search(
        self,
        query: str,
        k: int = 3,
        fetch_k: int = 10,
        lambda_mult: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        MMR(Maximum Marginal Relevance) 검색

        Args:
            query: 검색 쿼리
            k: 반환할 문서 수
            fetch_k: 초기 검색 문서 수
            lambda_mult: 다양성 vs 관련성 (0: 다양성, 1: 관련성)

        Returns:
            검색 결과 리스트
        """
        if self.store_type in ["chroma", "faiss"] and self._store:
            results = self._store.max_marginal_relevance_search(
                query, k=k, fetch_k=fetch_k, lambda_mult=lambda_mult
            )
            return [{
                "text": doc.page_content,
                "score": 0.0,  # MMR은 스코어 반환 안함
                "metadata": doc.metadata
            } for doc in results]

        # 메모리 저장소는 일반 유사도 검색으로 대체
        return self.similarity_search(query, k)

    def delete(self, ids: Optional[List[str]] = None):
        """문서 삭제"""
        if self.store_type == "chroma" and self._store:
            if ids:
                self._store.delete(ids=ids)
            else:
                # 전체 삭제
                self._store.delete_collection()
                self._init_chroma()

        elif self.store_type == "memory":
            self._store = {
                "documents": [],
                "embeddings": [],
                "metadatas": []
            }

    def persist(self):
        """저장소 영구 저장"""
        if self.store_type == "chroma" and self.persist_directory:
            self._store.persist()
        elif self.store_type == "faiss" and self._store and self.persist_directory:
            self._store.save_local(self.persist_directory)

    def get_count(self) -> int:
        """저장된 문서 수 반환"""
        if self.store_type == "chroma" and self._store:
            return self._store._collection.count()
        elif self.store_type == "faiss" and self._store:
            return self._store.index.ntotal
        elif self.store_type == "memory":
            return len(self._store["documents"])
        return 0


class InMemoryVectorStore:
    """간단한 인메모리 벡터 저장소 (테스트/데모용)"""

    def __init__(self):
        self.documents: List[str] = []
        self.embeddings: List[List[float]] = []
        self.metadatas: List[dict] = []

    def add(
        self,
        texts: List[str],
        embeddings: List[List[float]],
        metadatas: Optional[List[dict]] = None
    ):
        """문서와 임베딩 추가"""
        self.documents.extend(texts)
        self.embeddings.extend(embeddings)
        self.metadatas.extend(metadatas or [{}] * len(texts))

    def search(
        self,
        query_embedding: List[float],
        k: int = 3
    ) -> List[Dict[str, Any]]:
        """유사도 검색"""
        import numpy as np

        if not self.embeddings:
            return []

        query = np.array(query_embedding)
        scores = []

        for emb in self.embeddings:
            emb_arr = np.array(emb)
            score = np.dot(query, emb_arr) / (
                np.linalg.norm(query) * np.linalg.norm(emb_arr)
            )
            scores.append(float(score))

        top_indices = np.argsort(scores)[-k:][::-1]

        return [{
            "id": i,
            "text": self.documents[i],
            "score": scores[i],
            "metadata": self.metadatas[i]
        } for i in top_indices]

    def clear(self):
        """모든 데이터 삭제"""
        self.documents = []
        self.embeddings = []
        self.metadatas = []

    def to_dict(self) -> dict:
        """직렬화"""
        return {
            "documents": self.documents,
            "embeddings": self.embeddings,
            "metadatas": self.metadatas
        }

    @classmethod
    def from_dict(cls, data: dict) -> "InMemoryVectorStore":
        """역직렬화"""
        store = cls()
        store.documents = data.get("documents", [])
        store.embeddings = data.get("embeddings", [])
        store.metadatas = data.get("metadatas", [])
        return store
