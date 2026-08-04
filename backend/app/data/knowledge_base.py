"""Curated wildfire-smoke health guidance knowledge base for the Ask assistant.

Every passage below is written in-house, modeled on the general shape of
public CDC/EPA guidance on wildfire smoke and air quality -- these are not
verbatim quotes from any single document, and none should be presented as
one. Each entry carries its own source_label so a judge (or the app itself)
can see exactly what a given answer is grounded in.

This file is the entire "corpus" the RAG assistant retrieves from -- see
app/services/rag_retrieval.py for how it's searched and
app/services/rag_answer.py for how an answer gets composed from the results.
Keeping the corpus in one plain-data file (same pattern as symptom_rules.py)
means there's nothing hidden in retrieval/generation logic: what the
assistant can possibly say is fully enumerated right here.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class KnowledgeEntry:
    id: str
    title: str
    tags: list[str]
    text: str
    source_label: str

    @property
    def searchable_text(self) -> str:
        return f"{self.title} {' '.join(self.tags)} {self.text}"


_EPA_AQI = "Modeled on EPA Air Quality Index guidance"
_CDC_SMOKE = "Modeled on CDC wildfire smoke guidance"
_EPA_SMOKE = "Modeled on EPA wildfire smoke guidance"

KNOWLEDGE_BASE: list[KnowledgeEntry] = [
    KnowledgeEntry(
        "aqi_scale_overview",
        "How the AQI scale works",
        ["aqi", "scale", "index", "0-500", "colors"],
        "The Air Quality Index runs from 0 to 500 and is grouped into six categories, from Good "
        "(0-50) through Hazardous (301-500). Each step up the scale means a bigger, not equal, "
        "jump in health risk -- the difference between Good and Moderate is much smaller than the "
        "difference between Unhealthy and Hazardous.",
        _EPA_AQI,
    ),
    KnowledgeEntry(
        "aqi_good_moderate",
        "Good and Moderate AQI",
        ["good", "moderate", "0-50", "51-100", "safe"],
        "AQI 0-50 (Good) and 51-100 (Moderate) are generally safe for everyone, including outdoor "
        "exercise and sports. At the upper end of Moderate, people who are unusually sensitive to "
        "particle pollution may want to reduce very prolonged or intense outdoor exertion, but most "
        "people won't notice any effect.",
        _EPA_AQI,
    ),
    KnowledgeEntry(
        "aqi_unhealthy_sensitive",
        "Unhealthy for Sensitive Groups",
        ["unhealthy for sensitive groups", "usg", "101-150", "asthma", "children", "elderly"],
        "AQI 101-150 (Unhealthy for Sensitive Groups) means people with asthma, COPD, heart disease, "
        "older adults, children, and pregnant people should start limiting prolonged or heavy outdoor "
        "exertion. The general public usually isn't affected yet at this level.",
        _EPA_AQI,
    ),
    KnowledgeEntry(
        "aqi_unhealthy",
        "Unhealthy AQI",
        ["unhealthy", "151-200", "everyone", "limit outdoor"],
        "At AQI 151-200 (Unhealthy), everyone -- not just sensitive groups -- should start limiting "
        "prolonged or heavy outdoor exertion. Sensitive groups should avoid prolonged or heavy "
        "outdoor exertion entirely at this level.",
        _EPA_AQI,
    ),
    KnowledgeEntry(
        "aqi_very_unhealthy_hazardous",
        "Very Unhealthy and Hazardous AQI",
        ["very unhealthy", "hazardous", "201-300", "301-500", "emergency", "stay indoors"],
        "AQI 201-300 (Very Unhealthy) is a health alert level -- everyone should avoid prolonged or "
        "heavy outdoor exertion, and sensitive groups should avoid all outdoor activity. AQI 301+ "
        "(Hazardous) is an emergency condition: everyone should avoid all outdoor physical activity "
        "and stay indoors with filtered air if at all possible.",
        _EPA_AQI,
    ),
    KnowledgeEntry(
        "outdoor_exercise_soccer",
        "Is it safe for outdoor sports practice?",
        ["soccer", "practice", "sports", "exercise", "kids", "team", "coach"],
        "For most people, outdoor sports and practice are fine through Good and Moderate AQI. At "
        "Unhealthy for Sensitive Groups, coaches should shorten practice and increase rest breaks, "
        "especially for players with asthma. At Unhealthy or worse, move practice indoors or "
        "reschedule -- intense exercise pulls far more smoke deep into the lungs than resting does.",
        _CDC_SMOKE,
    ),
    KnowledgeEntry(
        "outdoor_exercise_children",
        "Children and outdoor activity in smoke",
        ["children", "kids", "recess", "school", "playground"],
        "Children breathe more air relative to their body size than adults and are more likely to be "
        "active outdoors, so they get a higher effective dose of smoke at the same AQI. Schools "
        "should follow the Unhealthy for Sensitive Groups threshold as their cutoff for moving "
        "recess and PE indoors, even though that threshold is written for the general population "
        "starting one step later.",
        _CDC_SMOKE,
    ),
    KnowledgeEntry(
        "pm25_explained",
        "What PM2.5 means",
        ["pm2.5", "particulate matter", "particle", "size", "microns"],
        "PM2.5 refers to particles 2.5 micrometers or smaller -- about 1/30th the width of a human "
        "hair. They're small enough to bypass the nose and throat's normal filtering and reach deep "
        "into the lungs, and even the bloodstream. Wildfire smoke is overwhelmingly made of PM2.5, "
        "which is why smoke AQI tracks so closely with PM2.5 concentration.",
        _EPA_SMOKE,
    ),
    KnowledgeEntry(
        "wildfire_smoke_vs_pollution",
        "How wildfire smoke differs from typical air pollution",
        ["wildfire smoke", "urban pollution", "different", "worse"],
        "Wildfire smoke PM2.5 appears to be more irritating to the respiratory system per microgram "
        "than typical urban pollution PM2.5, based on hospital-visit data during smoke events. Smoke "
        "also spikes and clears faster than routine pollution, so AQI during a wildfire event can "
        "swing much more sharply within a single day.",
        _EPA_SMOKE,
    ),
    KnowledgeEntry(
        "asthma_copd_guidance",
        "Asthma and COPD guidance during smoke",
        ["asthma", "copd", "respiratory", "inhaler", "medication"],
        "People with asthma or COPD should follow their action plan and keep rescue medication on "
        "hand during smoke events, starting precautions at Unhealthy for Sensitive Groups rather than "
        "waiting for Unhealthy. Needing a rescue inhaler more often than usual is a sign to reduce "
        "exposure further and consider contacting a provider.",
        _CDC_SMOKE,
    ),
    KnowledgeEntry(
        "cardiovascular_guidance",
        "Heart disease guidance during smoke",
        ["cardiovascular", "heart disease", "heart", "chest"],
        "Smoke exposure is linked to increased risk of heart attack and stroke in people with existing "
        "cardiovascular disease, likely from inflammation and effects on blood clotting. People with "
        "heart conditions should limit outdoor exertion starting at Unhealthy for Sensitive Groups, "
        "and chest pain, palpitations, or unusual fatigue during a smoke event warrant medical "
        "attention rather than waiting it out.",
        _CDC_SMOKE,
    ),
    KnowledgeEntry(
        "pregnancy_guidance",
        "Pregnancy and wildfire smoke",
        ["pregnant", "pregnancy", "fetal", "birth"],
        "Some research links high PM2.5 exposure during pregnancy to increased risk of preterm birth "
        "and low birth weight. Pregnant people are grouped with sensitive populations and should limit "
        "outdoor exposure starting at Unhealthy for Sensitive Groups; reduced fetal movement or severe "
        "headache during a smoke event should be treated as a reason to seek care promptly, not smoke "
        "exposure specifically.",
        _CDC_SMOKE,
    ),
    KnowledgeEntry(
        "elderly_guidance",
        "Older adults and wildfire smoke",
        ["elderly", "older adults", "seniors", "age"],
        "Older adults are more likely to have underlying heart or lung disease that smoke can worsen, "
        "even if it hasn't been formally diagnosed. Guidance generally treats age 65+ as a sensitive "
        "group starting at Unhealthy for Sensitive Groups, the same threshold used for diagnosed "
        "respiratory and cardiovascular conditions.",
        _CDC_SMOKE,
    ),
    KnowledgeEntry(
        "outdoor_worker_guidance",
        "Outdoor workers and wildfire smoke",
        ["outdoor worker", "construction", "farm", "job", "occupation"],
        "Outdoor workers accumulate exposure over a full shift, so their effective dose at a given AQI "
        "is higher than someone outside briefly. Where possible, schedule the most strenuous outdoor "
        "tasks for the cleanest part of the day, increase break frequency as AQI rises, and use a "
        "properly fitted N95 above Unhealthy levels.",
        _CDC_SMOKE,
    ),
    KnowledgeEntry(
        "mask_n95",
        "N95 and KN95 masks for smoke",
        ["n95", "kn95", "mask", "respirator", "fit"],
        "A properly fitted N95 or KN95 respirator filters out the vast majority of wildfire smoke "
        "particles and is the mask type recommended once AQI reaches Unhealthy levels. Fit matters as "
        "much as filter rating -- gaps around the nose or cheeks let unfiltered air in, so the mask "
        "needs to seal against the face, and it generally won't fit a young child well.",
        _CDC_SMOKE,
    ),
    KnowledgeEntry(
        "mask_cloth_ineffective",
        "Why cloth and surgical masks don't help much with smoke",
        ["cloth mask", "surgical mask", "ineffective", "doesn't work"],
        "Cloth and standard surgical masks are designed to block droplets, not the much smaller smoke "
        "particles, and don't seal tightly against the face. They provide little meaningful protection "
        "against wildfire smoke -- an N95/KN95 respirator is the minimum for real filtration.",
        _CDC_SMOKE,
    ),
    KnowledgeEntry(
        "indoor_filtration_hepa",
        "HEPA air purifiers indoors",
        ["hepa", "air purifier", "filter", "indoor air"],
        "A HEPA air purifier sized for the room, run continuously with windows and doors closed, "
        "meaningfully reduces indoor PM2.5 during a smoke event. Central HVAC systems help too if "
        "fitted with a MERV 13 or higher filter and set to recirculate rather than pull in outside air.",
        _EPA_SMOKE,
    ),
    KnowledgeEntry(
        "diy_box_fan_filter",
        "DIY box fan air filters",
        ["diy", "box fan filter", "corsi-rosenthal", "cheap filter"],
        "A box fan with a MERV 13 furnace filter taped or clipped to the intake side -- or several "
        "filters built into a cube around the fan (a Corsi-Rosenthal box) -- is a low-cost way to "
        "meaningfully cut indoor PM2.5 when a commercial HEPA purifier isn't available.",
        _EPA_SMOKE,
    ),
    KnowledgeEntry(
        "closing_windows_clean_room",
        "Creating a clean room at home",
        ["clean room", "close windows", "seal", "one room"],
        "During a smoke event, close windows and doors and set one room -- ideally with the least "
        "outside-air leakage -- as a designated clean room with a portable air purifier. This gives "
        "sensitive household members a lower-exposure space to spend most of their time in without "
        "needing to filter the whole house.",
        _EPA_SMOKE,
    ),
    KnowledgeEntry(
        "when_to_evacuate",
        "Hazardous smoke and when to leave the area",
        ["evacuate", "hazardous", "leave", "relocate"],
        "Sustained Hazardous AQI (301+), especially for sensitive individuals without reliable indoor "
        "filtration, is a reason to consider relocating temporarily to cleaner air rather than "
        "sheltering in place -- a library, community center, or a friend's home outside the smoke "
        "plume are common options for people without a home air purifier.",
        _EPA_SMOKE,
    ),
    KnowledgeEntry(
        "when_to_seek_care",
        "When smoke-related symptoms need medical attention",
        ["seek care", "emergency", "911", "warning signs", "symptoms"],
        "Severe difficulty breathing, chest pain, confusion, or fainting during a smoke event are "
        "emergency warning signs and warrant immediate medical care or a 911 call, not waiting to see "
        "if they pass. Worsening wheeze, needing a rescue inhaler more than usual, or persistent chest "
        "tightness are reasons to contact a healthcare provider promptly even if not immediately "
        "life-threatening.",
        _CDC_SMOKE,
    ),
    KnowledgeEntry(
        "pets_guidance",
        "Pets and wildfire smoke",
        ["pets", "dog", "dogs", "cat", "cats", "animals", "walk", "walks"],
        "Pets, especially those with existing heart or lung conditions, are affected by smoke similarly "
        "to people. Keep pets indoors during smoke events, shorten walks, and watch for coughing, "
        "wheezing, or reduced activity as signs they're being affected.",
        _CDC_SMOKE,
    ),
    KnowledgeEntry(
        "long_term_exposure",
        "Repeated or chronic smoke exposure",
        ["chronic", "repeated exposure", "long-term", "season"],
        "Repeated smoke exposure across a wildfire season adds up even on days that individually seem "
        "moderate -- some research links elevated cumulative PM2.5 exposure to worse respiratory and "
        "cardiovascular outcomes over a season, not just on the worst single days. Reducing exposure "
        "on moderate days, not only hazardous ones, is part of managing seasonal risk.",
        _CDC_SMOKE,
    ),
    KnowledgeEntry(
        "monitoring_deserts",
        "Why official AQI monitors don't cover everywhere",
        ["monitoring desert", "no station", "rural", "coverage gap"],
        "Official AQI monitoring stations are unevenly distributed and often sparse in rural areas, "
        "leaving real gaps between the nearest station and where someone actually is -- these are "
        "sometimes called monitoring deserts. Crowd-sourced sky-photo reports and satellite-informed "
        "estimates are increasingly used to fill in those gaps between official stations.",
        _EPA_AQI,
    ),
]

_ALL_ENTRIES_BY_ID: dict[str, KnowledgeEntry] = {e.id: e for e in KNOWLEDGE_BASE}
