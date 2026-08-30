function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h2 className="text-base font-semibold mb-2">{title}</h2>
      <div className="text-sm space-y-2" style={{ color: "var(--text-secondary)" }}>
        {children}
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <main className="max-w-3xl mx-auto w-full px-4 py-8 space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">About Firebreak</h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          What each part of the app actually is, what it was trained or built on, and where its
          limits are.
        </p>
      </header>

      <Section title="Smoke density classifier">
        <p>
          MobileNetV2, transfer-learned (frozen backbone, fine-tuned last block + a 3-class head) on{" "}
          <strong>13,391 images</strong> from three geographically distinct sources -- HPWREN
          (Southern California), Pyronear (France), and SAINet (Argentina) -- so it isn&apos;t
          trained on a single region&apos;s sky.
        </p>
        <p>
          Test accuracy: <strong>79.5%</strong> on a 2,011-image held-out set (clear/hazy/heavy).
          The failure mode we specifically checked for is false reassurance -- a real{" "}
          <code>heavy</code> smoke photo predicted as <code>clear</code> -- which happens 2.0% of
          the time in testing. That&apos;s why the personal risk engine always takes the more
          severe of the photo reading and the official AQI reading, never the photo alone.
        </p>
      </Section>

      <Section title="Explainability overlay">
        <p>
          The classifier&apos;s head is a plain global-average-pool + single linear layer, which
          means a real Class Activation Map can be computed directly from the trained weights --
          no gradients, no separate model. Uploading a photo shows a heatmap of exactly which
          region of the sky the model weighted most heavily for its prediction.
        </p>
      </Section>

      <Section title="Personal risk scoring -- two layers">
        <p>
          <strong>Rule-based engine (default):</strong> a transparent lookup table combining
          AQI/smoke-density level with age, declared conditions, and outdoor occupation. No
          training signal exists to justify a model here, so it stays a readable decision table.
        </p>
        <p>
          <strong>Personal threshold model (optional):</strong> once someone has logged 6+ days of
          self-reported symptom severity alongside that day&apos;s AQI, a small logistic regression
          (plain numpy, no ML framework in production) fits <em>that one person&apos;s</em>{" "}
          apparent flare-up threshold, shown alongside -- not instead of -- the rule-based read.
        </p>
      </Section>

      <Section title="Symptom-flagging engine">
        <p>
          Deterministic, not an LLM: condition-specific checklists (asthma/COPD, cardiovascular,
          pregnancy, general) modeled on CDC/EPA guidance, with a fixed threshold table -- any
          single emergency-tier symptom (severe difficulty breathing, chest pain, confusion) forces
          a &quot;seek immediate care / call 911&quot; flag on its own. The whole rule table lives
          in one file specifically so it&apos;s auditable, not black-box.
        </p>
      </Section>

      <Section title="Symptom pattern match">
        <p>
          Real, but a rule table not a model: a second, independent pass over the same four
          checklist buckets from the symptom-flagging engine, scoring which bucket&apos;s symptom
          profile the checked-off symptoms resemble most closely (critical symptoms weighted 2x,
          everything else 1x). It only reports a match above a 40% weighted-overlap threshold and
          with at least two symptoms checked -- otherwise it says so honestly rather than forcing
          a result from thin signal. Purely educational context, shown separately from the
          urgency flag, which stays the one thing this feature treats as a safety signal.
        </p>
      </Section>

      <Section title="Short-term trend & forecast">
        <p>
          Holt&apos;s linear trend method (double exponential smoothing) over recently logged AQI
          readings, adapted for irregular real-world sampling intervals. A genuinely distinct
          technique from the CV model and the rule engines -- a real point forecast (e.g. AQI in
          3h), not just a slope label -- always labeled as a statistical extrapolation, not an
          atmospheric forecast.
        </p>
      </Section>

      <Section title="Ask assistant">
        <p>
          Retrieval, not generation: TF-IDF search (plain numpy, no embedding model) over a small
          curated knowledge base of wildfire-smoke guidance, with the final answer assembled by
          fixed rules from the retrieved passages -- never a free-form generative model. Every
          answer cites which knowledge-base entries it came from. It can reference your
          symptom-checklist result in conversation, but it&apos;s explaining a decision the
          deterministic symptom engine already made, not making a safety call itself.
        </p>
      </Section>

      <Section title="Monitoring-desert coverage map">
        <p>
          Crowd-submitted sky photos fill gaps between official AQI stations. Submitted locations
          are fuzzed to a ~1km geohash cell before storage -- never exact coordinates -- and photos
          are kept for 48 hours only, then purged, with the classification/trust-score record
          retained after that.
        </p>
      </Section>

      <Section title="Privacy">
        <p>
          No accounts. Your risk profile and detailed symptom-checklist log live in this
          browser&apos;s local storage only and are never sent anywhere. The daily symptom
          check-in (which powers the personal threshold model) and crowd submissions do reach the
          backend, tied only to a random anonymous ID generated in your browser -- never a name,
          email, or login.
        </p>
      </Section>

      <Section title="Known limitations">
        <ul className="list-disc pl-5 space-y-1">
          <li>Training data comes from fixed lookout/surveillance cameras in three specific countries -- not a global or handheld-photo sample.</li>
          <li>The Ask assistant only knows what&apos;s in its curated knowledge base; it says so honestly rather than guessing when a question falls outside it.</li>
          <li>None of this is a medical device or a substitute for professional medical guidance -- every safety-relevant feature says so directly, not in fine print.</li>
        </ul>
      </Section>
    </main>
  );
}
