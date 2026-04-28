"""
chunker.py - Text Chunking Module
다양한 청킹 전략 구현
"""

from typing import List, Optional, Literal
from langchain_core.documents import Document
from langchain_text_splitters import (
    RecursiveCharacterTextSplitter,
    CharacterTextSplitter,
)


class Chunker:
    """텍스트 청킹을 수행하는 클래스"""

    @staticmethod
    def chunk_text(
        text: str,
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        method: Literal["recursive", "character", "sentence", "semantic"] = "recursive",
        separators: Optional[List[str]] = None
    ) -> List[dict]:
        """
        텍스트를 청킹하여 청크 리스트 반환

        Args:
            text: 청킹할 텍스트
            chunk_size: 청크 크기
            chunk_overlap: 청크 간 오버랩
            method: 청킹 방식
            separators: 커스텀 구분자 리스트

        Returns:
            청크 정보 리스트 (text, start, end, length)
        """
        if method == "recursive":
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                separators=separators or ["\n\n", "\n", ". ", " ", ""],
                length_function=len
            )
        elif method == "character":
            splitter = CharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                separator=separators[0] if separators else "\n\n",
                length_function=len
            )
        elif method == "sentence":
            # 문장 단위 분리
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                separators=[". ", "! ", "? ", "\n", " "],
                length_function=len
            )
        else:
            # semantic은 임베딩 기반이라 기본 recursive 사용
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                length_function=len
            )

        chunks = splitter.split_text(text)

        # 청크 정보 생성
        result = []
        position = 0
        for i, chunk in enumerate(chunks):
            # 원본 텍스트에서 위치 찾기
            start = text.find(chunk[:50], position)
            if start == -1:
                start = position
            end = start + len(chunk)

            result.append({
                "id": i,
                "text": chunk,
                "start": start,
                "end": end,
                "length": len(chunk)
            })
            position = max(position, start + 1)

        return result

    @staticmethod
    def chunk_documents(
        documents: List[Document],
        chunk_size: int = 500,
        chunk_overlap: int = 50,
        method: str = "recursive"
    ) -> List[Document]:
        """
        Document 리스트를 청킹

        Args:
            documents: Document 리스트
            chunk_size: 청크 크기
            chunk_overlap: 청크 간 오버랩
            method: 청킹 방식

        Returns:
            청킹된 Document 리스트
        """
        if method == "recursive":
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                length_function=len
            )
        else:
            splitter = CharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                length_function=len
            )

        return splitter.split_documents(documents)

    @staticmethod
    def chunk_with_tiktoken(
        text: str,
        chunk_size: int = 100,
        chunk_overlap: int = 0,
        encoding: str = "cl100k_base"
    ) -> List[dict]:
        """
        토큰 기반 청킹 (tiktoken 사용)

        Args:
            text: 청킹할 텍스트
            chunk_size: 토큰 수 기준 청크 크기
            chunk_overlap: 토큰 수 기준 오버랩
            encoding: tiktoken 인코딩

        Returns:
            청크 정보 리스트
        """
        try:
            import tiktoken
            tokenizer = tiktoken.get_encoding(encoding)

            def tiktoken_len(t):
                return len(tokenizer.encode(t))

            splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                length_function=tiktoken_len
            )

            chunks = splitter.split_text(text)

            return [{
                "id": i,
                "text": chunk,
                "length": len(chunk),
                "token_count": tiktoken_len(chunk)
            } for i, chunk in enumerate(chunks)]

        except ImportError:
            # tiktoken 없으면 일반 청킹
            return Chunker.chunk_text(text, chunk_size * 4, chunk_overlap * 4)

    @staticmethod
    def preview_chunks(
        text: str,
        chunk_size: int = 500,
        chunk_overlap: int = 50
    ) -> dict:
        """
        청킹 미리보기 - UI에서 시각화용

        Returns:
            청킹 통계 및 미리보기 정보
        """
        chunks = Chunker.chunk_text(text, chunk_size, chunk_overlap)

        return {
            "total_chars": len(text),
            "total_chunks": len(chunks),
            "avg_chunk_size": sum(c["length"] for c in chunks) / len(chunks) if chunks else 0,
            "chunks": chunks[:10],  # 처음 10개만
            "chunk_sizes": [c["length"] for c in chunks]
        }
