"""TF-IDF retrieval over the wildfire-smoke knowledge base -- the "R" in RAG.

Deliberately not an embedding model or an LLM call: the knowledge base is a
few dozen short passages, which is exactly the regime where classic TF-IDF +
cosine similarity retrieves as well as anything heavier, at zero cost, zero
external dependency, and instant startup. numpy is already a production
dependency (see app/ml/inference.py) -- this adds nothing new to the deploy.

Answer *composition* from the retrieved passages lives in rag_answer.py;
this module only does retrieval.
"""

import re
from dataclasses import dataclass

import numpy as np

from app.data.knowledge_base import KNOWLEDGE_BASE, KnowledgeEntry

_TOKEN_RE = re.compile(r"[a-z0-9]+")
_STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "and", "or", "but", "if", "of", "to", "in", "on", "for", "with",
    "at", "by", "from", "as", "it", "this", "that", "my", "your", "i",
    "do", "does", "did", "will", "would", "should", "can", "could",
    "what", "how", "when", "why", "about",
}


def _tokenize(text: str) -> list[str]:
    return [t for t in _TOKEN_RE.findall(text.lower()) if t not in _STOPWORDS and len(t) > 1]


@dataclass(frozen=True)
class RetrievalResult:
    entry: KnowledgeEntry
    score: float


class _TfidfIndex:
    def __init__(self, entries: list[KnowledgeEntry]):
        self.entries = entries
        doc_tokens = [_tokenize(e.searchable_text) for e in entries]

        vocab: dict[str, int] = {}
        for tokens in doc_tokens:
            for tok in tokens:
                if tok not in vocab:
                    vocab[tok] = len(vocab)
        self.vocab = vocab

        n_docs, n_vocab = len(entries), len(vocab)
        tf = np.zeros((n_docs, n_vocab), dtype=np.float64)
        for i, tokens in enumerate(doc_tokens):
            if not tokens:
                continue
            for tok in tokens:
                tf[i, vocab[tok]] += 1.0
            tf[i] /= len(tokens)

        # smoothed idf, same form as sklearn's default: log((1+n)/(1+df)) + 1
        df = (tf > 0).sum(axis=0)
        idf = np.log((1 + n_docs) / (1 + df)) + 1.0
        self.idf = idf

        matrix = tf * idf
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        self.matrix = matrix / norms

    def _vectorize_query(self, query: str) -> np.ndarray:
        tokens = _tokenize(query)
        vec = np.zeros(len(self.vocab), dtype=np.float64)
        if not tokens:
            return vec
        for tok in tokens:
            idx = self.vocab.get(tok)
            if idx is not None:
                vec[idx] += 1.0
        vec /= len(tokens)
        vec *= self.idf
        norm = np.linalg.norm(vec)
        return vec / norm if norm > 0 else vec

    def search(self, query: str, top_k: int, min_score: float) -> list[RetrievalResult]:
        query_vec = self._vectorize_query(query)
        if not np.any(query_vec):
            return []
        scores = self.matrix @ query_vec
        top_indices = np.argsort(-scores)[:top_k]
        return [
            RetrievalResult(entry=self.entries[i], score=float(scores[i]))
            for i in top_indices
            if scores[i] >= min_score
        ]


_index = _TfidfIndex(KNOWLEDGE_BASE)


def retrieve(query: str, top_k: int = 3, min_score: float = 0.08) -> list[RetrievalResult]:
    return _index.search(query, top_k=top_k, min_score=min_score)
