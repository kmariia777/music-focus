import { LegalLayout, LegalSection } from "@/components/LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy" updated="September 29, 2026">
      <LegalSection heading="Overview">
        <p>
          Focus Music Hub is a Pomodoro timer, task list, and focus-music app.
          It is designed to work without collecting your personal data: there are
          no accounts, no sign-ups, and no analytics.
        </p>
        <p>
          If you have questions about this policy, contact us at{" "}
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

      <LegalSection heading="Data we collect">
        <p>
          <strong style={{ color: "hsl(var(--foreground))" }}>We do not collect personal data.</strong>{" "}
          Focus Music Hub does not ask for your name, email address, or any other
          identifier. There is no account system, and we run no analytics,
          advertising trackers, or crash reporters.
        </p>
      </LegalSection>

      <LegalSection heading="Data stored on your device">
        <p>
          Your timer settings, task list, and session statistics are stored only in
          your own browser&apos;s local storage. This data never leaves your device
          and is never sent to us or to any third party. You can delete it at any
          time from the app&apos;s Settings (Reset stats / Clear tasks) or by clearing
          your browser&apos;s site data.
        </p>
      </LegalSection>

      <LegalSection heading="Network requests">
        <p>
          The app loads its interface and streams music from our own servers. Like
          most web services, our hosting provider may keep standard technical logs
          (such as IP addresses and request timestamps) for security and
          operations. These logs are not used to identify you or to build a profile
          of your activity.
        </p>
      </LegalSection>

      <LegalSection heading="Third parties">
        <p>
          We share no data with third parties, because there is no data to share.
          The app currently integrates with no external services: there is no AI
          assistant, no calendar connection, and no social login.
        </p>
      </LegalSection>

      <LegalSection heading="Children's privacy">
        <p>
          Focus Music Hub is not directed at children under 13, and we do not
          knowingly collect information from children. If you are under 13, please
          use the app only with a parent or guardian.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to this policy">
        <p>
          If this policy changes, we will update the &quot;Last updated&quot; date
          above. Continued use of the app after a change means you accept the
          updated policy.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
