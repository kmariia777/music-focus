import { LegalLayout, LegalSection } from "@/components/LegalLayout";

export default function Terms() {
  return (
    <LegalLayout title="Terms of Service" updated="September 29, 2026">
      <LegalSection heading="The service">
        <p>
          Hyper-Focus Music provides a Pomodoro timer, a personal task list, and
          curated focus-music stations. By using the app, you agree to these terms.
        </p>
      </LegalSection>

      <LegalSection heading="License">
        <p>
          We grant you a personal, non-exclusive, non-transferable, revocable
          license to use Hyper-Focus Music for your own productivity. You may not
          copy, resell, or redistribute the app or its music streams, attempt to
          disrupt the service, or use it for any unlawful purpose.
        </p>
      </LegalSection>

      <LegalSection heading="Music">
        <p>
          All station music is by Kevin MacLeod (incompetech.com), licensed under{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
            style={{ color: "hsl(var(--foreground))" }}
          >
            Creative Commons Attribution 4.0 International (CC BY 4.0)
          </a>
          . Attribution is provided in the app under Settings → Music Credits.
          Some tracks have been seamlessly looped into extended mixes for
          focus-length sessions, as permitted by the license.
        </p>
      </LegalSection>

      <LegalSection heading="Your data">
        <p>
          Your settings, tasks, and statistics are stored only on your own device
          (see our <a href="/privacy" className="underline underline-offset-2" style={{ color: "hsl(var(--foreground))" }}>Privacy Policy</a>).
          You are responsible for the content you enter, and for keeping your
          device secure.
        </p>
      </LegalSection>

      <LegalSection heading="No warranty">
        <p>
          The app is provided &quot;as is&quot; without warranties of any kind. We do
          not guarantee uninterrupted availability, and the app is a productivity
          aid — not medical, therapeutic, or professional advice.
        </p>
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        <p>
          To the maximum extent permitted by law, we are not liable for any
          indirect, incidental, or consequential damages arising from your use of
          the app.
        </p>
      </LegalSection>

      <LegalSection heading="Age">
        <p>
          You must be at least 13 years old to use Hyper-Focus Music, or use it with
          a parent or guardian.
        </p>
      </LegalSection>

      <LegalSection heading="Changes and termination">
        <p>
          We may update these terms or discontinue the service at any time. If a
          change is material, we will update the &quot;Last updated&quot; date above.
          Continued use after a change means you accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          Questions about these terms:{" "}
          <a
            href="mailto:info@coregridit.com"
            className="underline underline-offset-2"
            style={{ color: "hsl(var(--foreground))" }}
          >
            info@coregridit.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
