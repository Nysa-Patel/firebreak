"""Answer composition for the Ask assistant -- the "AG" in RAG, without an LLM.

Given retrieved passages (app/services/rag_retrieval.py) and optional live
app context (current AQI, the user's last symptom-checklist result), this
assembles a final answer by simple, readable rules: lead with the live
context when the question is asking about "now"/"today", follow with the
retrieved passage text verbatim, and always attach which knowledge-base
entries it came from.

This is explicitly NOT the assistant making a safety call -- when it
surfaces the symptom-checklist result, it's explaining a decision that
app.services.symptom_rules already made deterministically, the same way a
person might explain a lab result back to someone. The assistant never
computes or overrides a risk/symptom level itself.
"""

from app.models.schemas import AqiCategory, AskContext, SymptomFlagLevel
from app.services.rag_retrieval import RetrievalResult, retrieve

ASK_DISCLAIMER = (
    "Answers are retrieved from a small curated set of general wildfire-smoke guidance, not a "
    "live medical database or a doctor -- for anything about your specific health, follow your "
    "provider's guidance over this tool."
)

_FALLBACK_ANSWER = (
    "I don't have grounded guidance for that specific question. Try asking about AQI levels, "
    "outdoor activity or sports, specific health conditions (asthma, heart disease, pregnancy), "
    "masks, indoor air filtration, or when to seek medical care."
)

_AQI_CATEGORY_LABEL: dict[AqiCategory, str] = {
    "good": "Good",
    "moderate": "Moderate",
    "unhealthy_sensitive": "Unhealthy for Sensitive Groups",
    "unhealthy": "Unhealthy",
    "very_unhealthy": "Very Unhealthy",
    "hazardous": "Hazardous",
}

_CURRENT_CONDITIONS_CUES = ("today", "now", "right now", "current", "currently", "here", "outside", "safe for", "is it safe")
_PERSONAL_CUES = ("my ", "i ", "me ", "should i", "am i", "for me")

_URGENT_SYMPTOM_LEVELS: set[SymptomFlagLevel] = {"urgent", "emergency"}
_NOTEWORTHY_SYMPTOM_LEVELS: set[SymptomFlagLevel] = {"mild", "elevated"}


def _mentions_any(question: str, cues: tuple[str, ...]) -> bool:
    q = f" {question.lower()} "
    return any(cue in q for cue in cues)


def compose_answer(question: str, context: AskContext | None) -> tuple[str, bool, list[RetrievalResult]]:
    results = retrieve(question, top_k=2)
    if not results:
        return _FALLBACK_ANSWER, False, []

    lead_ins: list[str] = []

    if context and context.aqi is not None and _mentions_any(question, _CURRENT_CONDITIONS_CUES):
        category_label = _AQI_CATEGORY_LABEL.get(context.aqi_category, context.aqi_category or "unknown")
        lead_ins.append(f"Right now your area is at AQI {context.aqi} ({category_label}).")

    if context and context.symptom_message:
        # Emergency/urgent context matters regardless of exact phrasing -- a safety-relevant
        # answer shouldn't be gated behind guessing the right keywords. Milder levels only
        # surface when the question is personally directed, so routine AQI questions don't get
        # cluttered with unrelated symptom notes.
        if context.symptom_level in _URGENT_SYMPTOM_LEVELS or (
            context.symptom_level in _NOTEWORTHY_SYMPTOM_LEVELS and _mentions_any(question, _PERSONAL_CUES)
        ):
            lead_ins.append(f"Based on the symptoms you logged: {context.symptom_message}")

    passages = [r.entry.text for r in results]
    body = "\n\n".join(passages)

    answer = "\n\n".join([*lead_ins, body])
    return answer, True, results
