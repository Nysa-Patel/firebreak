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

      <Section title="How it works">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <strong>Sky photos</strong> are read by a real trained image model (79.5% accurate),
            with a heatmap showing exactly what it looked at -- and the app always trusts whichever
            reading is worse, photo or official AQI, never the photo alone.
          </li>
          <li>
            <strong>Your risk score</strong>{" "}
            is a transparent rule table (AQI + age + conditions),
            plus an optional personal-threshold layer once you&apos;ve logged enough days --
            shown alongside, never instead of, the rule-based read.
          </li>
          <li>
            <strong>Symptom checks</strong> are fixed rule tables, not models -- a single emergency
            symptom always overrides everything else.
          </li>
          <li>
            <strong>Trends</strong> are a real statistical forecast, clearly labeled as an
            estimate -- never dressed up as a weather forecast.
          </li>
          <li>
            <strong>Ask</strong> answers are retrieved from a small curated knowledge base and
            cite their source -- never a generative AI model.
          </li>
          <li>
            <strong>Coverage map</strong> photos fill gaps between official stations; locations are
            fuzzed before storage.
          </li>
        </ul>
        <p className="pt-1">
          Not a medical device or a substitute for professional guidance -- always defer to a
          healthcare provider.
        </p>
      </Section>

      <Section title="Ethics">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>Any single emergency symptom overrides everything else -- no score or model can quietly downgrade it.</li>
          <li>The risk engine always takes the worse of the photo reading or official AQI, so one bad photo call can&apos;t slip through alone.</li>
          <li>No LLM anywhere in this app -- Ask retrieves passages and cites them, it never generates an answer.</li>
          <li>No black-box decisions -- risk scoring and symptom checks are plain, auditable rule tables.</li>
        </ul>
      </Section>

      <Section title="Privacy">
        <p>
          No accounts. Your profile and symptom-checklist log stay in this browser only. Anything
          that reaches the backend -- daily check-ins, crowd photo submissions -- is tied to a
          random anonymous ID, never a name, email, or login. Crowd-submitted locations are fuzzed
          before storage, and photos are deleted after 48 hours.
        </p>
      </Section>
    </main>
  );
}
