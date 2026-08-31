"""Symptom pattern-match scoring.

A second, independent pass over the same checklist data as
symptom_rules.py, and just a weighted-overlap calculation against the four
condition buckets already defined there. Given whatever symptoms were
actually checked (not necessarily the bucket the user started from), this
says which bucket's symptom profile the checked set resembles most. Purely
educational context. The urgency flag in symptom_rules.py is still the one
thing this app treats as an actual safety signal.
"""

from dataclasses import dataclass

from app.services.symptom_rules import CHECKLISTS, ConditionBucket, Symptom

# Critical symptoms count double. Checking one critical-tier symptom from a
# bucket should weigh as much as checking two mild/moderate ones, matching
# how symptom_rules.py's own urgency table already treats critical symptoms.
_CRITICAL_WEIGHT = 2
_STANDARD_WEIGHT = 1

# Below this percentage the overlap could just be one shared mild symptom by
# coincidence, not a real resemblance to the bucket's profile.
_MATCH_THRESHOLD_PCT = 40.0

# A single checked symptom can trivially clear 40%+ of a small bucket's
# weight without meaning anything, so require at least two. Same idea as
# personal_model.py refusing to fit a threshold from too few logged days:
# say "not enough signal" instead of forcing a result out of thin data.
_MIN_SYMPTOMS_CHECKED = 2


def _symptom_weight(symptom: Symptom) -> int:
    return _CRITICAL_WEIGHT if symptom.tier == "critical" else _STANDARD_WEIGHT


@dataclass(frozen=True)
class PatternMatchResult:
    matched: bool
    pattern: ConditionBucket | None
    score: float | None
    matched_symptoms: list[str]
    reason: str


def _bucket_score(bucket: ConditionBucket, checked_ids: set[str]) -> tuple[float, list[str]]:
    symptoms = CHECKLISTS[bucket]
    total_weight = sum(_symptom_weight(s) for s in symptoms)
    matched = [s for s in symptoms if s.id in checked_ids]
    matched_weight = sum(_symptom_weight(s) for s in matched)
    score = (matched_weight / total_weight) * 100 if total_weight else 0.0
    return score, [s.label for s in matched]


def match_pattern(checked_symptom_ids: list[str]) -> PatternMatchResult:
    checked_ids = set(checked_symptom_ids)

    if len(checked_ids) < _MIN_SYMPTOMS_CHECKED:
        return PatternMatchResult(
            matched=False,
            pattern=None,
            score=None,
            matched_symptoms=[],
            reason=(
                f"Fewer than {_MIN_SYMPTOMS_CHECKED} symptoms checked -- "
                "not enough signal to compare against a pattern."
            ),
        )

    # Score every bucket, not just whichever one the user's declared condition
    # put in front of them. The whole point is surfacing a resemblance they
    # might not have picked themselves.
    scored = [(bucket, *_bucket_score(bucket, checked_ids)) for bucket in CHECKLISTS]
    best_bucket, best_score, best_matches = max(scored, key=lambda t: t[1])

    if best_score < _MATCH_THRESHOLD_PCT:
        return PatternMatchResult(
            matched=False,
            pattern=None,
            score=round(best_score, 1),
            matched_symptoms=[],
            reason=(
                f"Closest pattern ({best_bucket}) only reached {best_score:.0f}% overlap, "
                f"below the {_MATCH_THRESHOLD_PCT:.0f}% match threshold."
            ),
        )

    return PatternMatchResult(
        matched=True,
        pattern=best_bucket,
        score=round(best_score, 1),
        matched_symptoms=best_matches,
        reason=f"{best_score:.0f}% weighted overlap with the {best_bucket} symptom profile.",
    )
