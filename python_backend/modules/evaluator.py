"""
evaluator.py - RAG Evaluation Module
RAGAS 기반 평가 지표 계산
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class EvaluationResult:
    """평가 결과"""
    faithfulness: float  # 충실도 (0-1)
    relevancy: float  # 관련성 (0-1)
    context_precision: float  # 컨텍스트 정밀도 (0-1)
    context_recall: float  # 컨텍스트 재현율 (0-1)
    answer_similarity: float  # 답변 유사도 (0-1)
    overall_score: float  # 종합 점수 (0-1)
    details: Dict[str, Any]  # 상세 정보


class RAGEvaluator:
    """RAG 파이프라인 평가기"""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self._ragas_available = False
        self._check_ragas()

    def _check_ragas(self):
        """RAGAS 라이브러리 확인"""
        try:
            import ragas
            self._ragas_available = True
        except ImportError:
            self._ragas_available = False

    def evaluate(
        self,
        query: str,
        answer: str,
        contexts: List[str],
        ground_truth: Optional[str] = None
    ) -> EvaluationResult:
        """
        RAG 응답 평가

        Args:
            query: 사용자 질문
            answer: 생성된 답변
            contexts: 검색된 컨텍스트 리스트
            ground_truth: 정답 (선택)

        Returns:
            평가 결과
        """
        if self._ragas_available and self.api_key:
            return self._evaluate_with_ragas(query, answer, contexts, ground_truth)
        else:
            return self._evaluate_simple(query, answer, contexts, ground_truth)

    def _evaluate_with_ragas(
        self,
        query: str,
        answer: str,
        contexts: List[str],
        ground_truth: Optional[str] = None
    ) -> EvaluationResult:
        """RAGAS를 사용한 평가"""
        try:
            from ragas import evaluate
            from ragas.metrics import (
                faithfulness,
                answer_relevancy,
                context_precision,
                context_recall
            )
            from datasets import Dataset
            import os

            os.environ["OPENAI_API_KEY"] = self.api_key

            # 데이터셋 준비
            data = {
                "question": [query],
                "answer": [answer],
                "contexts": [contexts]
            }
            if ground_truth:
                data["ground_truth"] = [ground_truth]

            dataset = Dataset.from_dict(data)

            # 평가 실행
            metrics = [faithfulness, answer_relevancy, context_precision]
            if ground_truth:
                metrics.append(context_recall)

            result = evaluate(dataset, metrics=metrics)

            # 결과 추출
            faith_score = float(result.get("faithfulness", 0))
            rel_score = float(result.get("answer_relevancy", 0))
            prec_score = float(result.get("context_precision", 0))
            rec_score = float(result.get("context_recall", 0)) if ground_truth else 0

            overall = (faith_score + rel_score + prec_score) / 3
            if ground_truth:
                overall = (faith_score + rel_score + prec_score + rec_score) / 4

            return EvaluationResult(
                faithfulness=faith_score,
                relevancy=rel_score,
                context_precision=prec_score,
                context_recall=rec_score,
                answer_similarity=0.0,
                overall_score=overall,
                details={"method": "ragas", "raw_result": dict(result)}
            )

        except Exception as e:
            # RAGAS 실패 시 간단한 평가로 폴백
            return self._evaluate_simple(query, answer, contexts, ground_truth)

    def _evaluate_simple(
        self,
        query: str,
        answer: str,
        contexts: List[str],
        ground_truth: Optional[str] = None
    ) -> EvaluationResult:
        """간단한 휴리스틱 기반 평가"""
        # 컨텍스트 관련성: 쿼리 키워드가 컨텍스트에 있는지
        query_words = set(query.lower().split())
        context_text = " ".join(contexts).lower()
        context_overlap = sum(1 for w in query_words if w in context_text) / max(len(query_words), 1)

        # 답변 관련성: 답변이 컨텍스트 내용을 포함하는지
        answer_lower = answer.lower()
        context_in_answer = 0
        for ctx in contexts:
            ctx_words = ctx.lower().split()[:10]  # 처음 10단어
            overlap = sum(1 for w in ctx_words if w in answer_lower)
            context_in_answer = max(context_in_answer, overlap / max(len(ctx_words), 1))

        # 충실도: 답변이 너무 길거나 짧지 않은지
        answer_length = len(answer)
        context_length = sum(len(c) for c in contexts)
        if context_length > 0:
            length_ratio = answer_length / context_length
            faithfulness = min(1.0, max(0.3, 1 - abs(length_ratio - 0.3)))
        else:
            faithfulness = 0.5

        # 답변 유사도 (ground_truth 있을 때)
        answer_similarity = 0.0
        if ground_truth:
            gt_words = set(ground_truth.lower().split())
            ans_words = set(answer.lower().split())
            if gt_words:
                answer_similarity = len(gt_words & ans_words) / len(gt_words | ans_words)

        # 전체 점수
        overall = (context_overlap + context_in_answer + faithfulness) / 3
        if ground_truth:
            overall = (context_overlap + context_in_answer + faithfulness + answer_similarity) / 4

        return EvaluationResult(
            faithfulness=round(faithfulness, 3),
            relevancy=round(context_in_answer, 3),
            context_precision=round(context_overlap, 3),
            context_recall=round(context_overlap, 3),
            answer_similarity=round(answer_similarity, 3),
            overall_score=round(overall, 3),
            details={
                "method": "simple_heuristic",
                "query_word_count": len(query_words),
                "context_count": len(contexts),
                "answer_length": answer_length
            }
        )

    def evaluate_batch(
        self,
        samples: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        배치 평가

        Args:
            samples: 샘플 리스트 [{"query": ..., "answer": ..., "contexts": [...], "ground_truth": ...}, ...]

        Returns:
            배치 평가 결과
        """
        results = []
        for sample in samples:
            result = self.evaluate(
                query=sample["query"],
                answer=sample["answer"],
                contexts=sample.get("contexts", []),
                ground_truth=sample.get("ground_truth")
            )
            results.append({
                "query": sample["query"],
                "faithfulness": result.faithfulness,
                "relevancy": result.relevancy,
                "context_precision": result.context_precision,
                "context_recall": result.context_recall,
                "answer_similarity": result.answer_similarity,
                "overall_score": result.overall_score
            })

        # 평균 계산
        avg_scores = {
            "faithfulness": sum(r["faithfulness"] for r in results) / len(results),
            "relevancy": sum(r["relevancy"] for r in results) / len(results),
            "context_precision": sum(r["context_precision"] for r in results) / len(results),
            "context_recall": sum(r["context_recall"] for r in results) / len(results),
            "answer_similarity": sum(r["answer_similarity"] for r in results) / len(results),
            "overall_score": sum(r["overall_score"] for r in results) / len(results)
        }

        return {
            "sample_count": len(samples),
            "average_scores": avg_scores,
            "individual_results": results
        }


class MockEvaluator:
    """테스트용 가짜 평가기"""

    def evaluate(
        self,
        query: str,
        answer: str,
        contexts: List[str],
        ground_truth: Optional[str] = None
    ) -> EvaluationResult:
        """가짜 평가 결과 생성"""
        import random

        # 일관된 결과를 위해 입력 해시 기반 시드
        seed = hash(query + answer) % 1000
        random.seed(seed)

        faithfulness = round(0.7 + random.random() * 0.25, 3)
        relevancy = round(0.6 + random.random() * 0.35, 3)
        context_precision = round(0.65 + random.random() * 0.3, 3)
        context_recall = round(0.6 + random.random() * 0.35, 3)
        answer_similarity = round(0.5 + random.random() * 0.4, 3) if ground_truth else 0

        overall = (faithfulness + relevancy + context_precision) / 3

        return EvaluationResult(
            faithfulness=faithfulness,
            relevancy=relevancy,
            context_precision=context_precision,
            context_recall=context_recall,
            answer_similarity=answer_similarity,
            overall_score=round(overall, 3),
            details={"method": "mock", "seed": seed}
        )


def get_evaluator(api_key: Optional[str] = None, use_mock: bool = False):
    """
    평가기 팩토리 함수

    Args:
        api_key: OpenAI API 키 (RAGAS용)
        use_mock: 테스트 모드 여부

    Returns:
        평가기 인스턴스
    """
    if use_mock or not api_key:
        return MockEvaluator()
    return RAGEvaluator(api_key=api_key)
