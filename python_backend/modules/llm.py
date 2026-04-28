"""
llm.py - LLM Module
다양한 LLM 모델 지원 (GPT-4, Claude, Gemini 등)
"""

from typing import List, Optional, Literal, Dict, Any
from langchain_core.messages import HumanMessage, SystemMessage


class LLMManager:
    """LLM 관리 클래스"""

    def __init__(
        self,
        model: Literal["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo", "claude-3-sonnet", "claude-3-haiku", "gemini-pro"] = "gpt-4o",
        api_key: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024
    ):
        self.model = model
        self.api_key = api_key
        self.temperature = temperature
        self.max_tokens = max_tokens
        self._llm = None

    def _get_llm(self):
        """LLM 인스턴스 초기화"""
        if self._llm is not None:
            return self._llm

        if self.model.startswith("gpt"):
            from langchain_openai import ChatOpenAI
            self._llm = ChatOpenAI(
                model=self.model,
                openai_api_key=self.api_key,
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )

        elif self.model.startswith("claude"):
            from langchain_anthropic import ChatAnthropic
            model_map = {
                "claude-3-sonnet": "claude-3-sonnet-20240229",
                "claude-3-haiku": "claude-3-haiku-20240307"
            }
            self._llm = ChatAnthropic(
                model=model_map.get(self.model, self.model),
                anthropic_api_key=self.api_key,
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )

        elif self.model.startswith("gemini"):
            from langchain_google_genai import ChatGoogleGenerativeAI
            self._llm = ChatGoogleGenerativeAI(
                model="gemini-pro",
                google_api_key=self.api_key,
                temperature=self.temperature,
                max_output_tokens=self.max_tokens
            )

        else:
            raise ValueError(f"Unknown model: {self.model}")

        return self._llm

    def generate(
        self,
        query: str,
        context: List[str],
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        RAG 응답 생성

        Args:
            query: 사용자 질문
            context: 검색된 컨텍스트 리스트
            system_prompt: 시스템 프롬프트 (선택)

        Returns:
            생성된 응답 및 메타데이터
        """
        llm = self._get_llm()

        # 기본 RAG 프롬프트
        if not system_prompt:
            system_prompt = """당신은 주어진 컨텍스트를 기반으로 질문에 답변하는 도움이 되는 AI 어시스턴트입니다.
컨텍스트에 없는 정보는 추측하지 말고, 모르면 모른다고 답하세요.
답변은 한국어로 명확하고 간결하게 작성하세요."""

        # 컨텍스트 포맷팅
        context_text = "\n\n---\n\n".join(context)

        # 프롬프트 구성
        user_message = f"""다음 컨텍스트를 참고하여 질문에 답변해주세요.

## 컨텍스트
{context_text}

## 질문
{query}

## 답변"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message)
        ]

        # 응답 생성
        response = llm.invoke(messages)

        return {
            "answer": response.content,
            "model": self.model,
            "usage": {
                "prompt_tokens": getattr(response, "usage_metadata", {}).get("input_tokens", 0),
                "completion_tokens": getattr(response, "usage_metadata", {}).get("output_tokens", 0)
            }
        }

    def chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ) -> str:
        """
        일반 채팅

        Args:
            messages: 메시지 히스토리 [{"role": "user", "content": "..."}, ...]
            system_prompt: 시스템 프롬프트

        Returns:
            응답 텍스트
        """
        llm = self._get_llm()

        langchain_messages = []
        if system_prompt:
            langchain_messages.append(SystemMessage(content=system_prompt))

        for msg in messages:
            if msg["role"] == "user":
                langchain_messages.append(HumanMessage(content=msg["content"]))

        response = llm.invoke(langchain_messages)
        return response.content


class MockLLM:
    """테스트용 가짜 LLM"""

    def __init__(self):
        self.responses = {
            "RAG": "RAG(Retrieval-Augmented Generation)는 대규모 언어 모델의 성능을 향상시키기 위해 외부 지식 베이스에서 관련 정보를 검색하여 응답 생성에 활용하는 기술입니다.",
            "청킹": "청킹(Chunking)은 긴 문서를 작은 조각으로 분할하는 과정입니다. chunk_size와 overlap이 중요한 파라미터이며, 적절한 크기로 분할해야 검색 품질이 향상됩니다.",
            "임베딩": "임베딩(Embedding)은 텍스트를 고차원 벡터로 변환하는 과정입니다. OpenAI, Cohere 등의 모델을 사용하여 의미적 유사성을 계산할 수 있게 됩니다.",
            "default": "주어진 컨텍스트를 기반으로 답변드리겠습니다. 해당 내용은 제공된 문서에서 확인할 수 있습니다."
        }

    def generate(
        self,
        query: str,
        context: List[str],
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """테스트 응답 생성"""
        # 쿼리에 포함된 키워드로 응답 선택
        answer = self.responses["default"]
        for keyword, response in self.responses.items():
            if keyword.lower() in query.lower():
                answer = response
                break

        # 컨텍스트 기반 응답 보강
        if context:
            answer = f"{answer}\n\n[참고 컨텍스트]\n{context[0][:200]}..."

        return {
            "answer": answer,
            "model": "mock-llm",
            "usage": {
                "prompt_tokens": len(query.split()) * 2,
                "completion_tokens": len(answer.split()) * 2
            },
            "is_mock": True
        }

    def chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ) -> str:
        """테스트 채팅 응답"""
        last_message = messages[-1]["content"] if messages else ""
        return f"[테스트 응답] {last_message}에 대한 답변입니다."


def get_llm(
    model: str = "gpt-4o",
    api_key: Optional[str] = None,
    temperature: float = 0.7,
    use_mock: bool = False
):
    """
    LLM 팩토리 함수

    Args:
        model: 모델 이름
        api_key: API 키
        temperature: 생성 온도
        use_mock: 테스트 모드 여부

    Returns:
        LLM 인스턴스
    """
    if use_mock or not api_key:
        return MockLLM()
    return LLMManager(model=model, api_key=api_key, temperature=temperature)


# 프롬프트 템플릿
PROMPT_TEMPLATES = {
    "rag_basic": """다음 컨텍스트를 기반으로 질문에 답변하세요.

컨텍스트:
{context}

질문: {question}

답변:""",

    "rag_detailed": """당신은 주어진 문서를 기반으로 정확하게 답변하는 AI 어시스턴트입니다.

## 지침
1. 오직 제공된 컨텍스트의 정보만 사용하세요
2. 컨텍스트에 없는 내용은 "해당 정보를 찾을 수 없습니다"라고 답하세요
3. 답변은 명확하고 구조화된 형태로 작성하세요

## 컨텍스트
{context}

## 질문
{question}

## 답변""",

    "cot": """다음 질문에 대해 단계별로 생각하며 답변하세요.

컨텍스트:
{context}

질문: {question}

단계별 사고:
1. 먼저 질문을 분석합니다...
2. 컨텍스트에서 관련 정보를 찾습니다...
3. 정보를 종합하여 답변을 도출합니다...

최종 답변:""",

    "few_shot": """다음은 컨텍스트 기반 질의응답의 예시입니다.

예시 1:
컨텍스트: 파이썬은 1991년에 귀도 반 로섬이 개발한 프로그래밍 언어입니다.
질문: 파이썬은 언제 개발되었나요?
답변: 파이썬은 1991년에 개발되었습니다.

예시 2:
컨텍스트: RAG는 검색 증강 생성의 약자로 LLM의 성능을 향상시킵니다.
질문: RAG가 무엇인가요?
답변: RAG는 Retrieval-Augmented Generation(검색 증강 생성)의 약자로, LLM의 성능을 향상시키는 기술입니다.

이제 아래 질문에 답변하세요:

컨텍스트: {context}
질문: {question}
답변:"""
}
