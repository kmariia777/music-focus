# Music Licenses — Focus Music Hub

All music in this app is by **Kevin MacLeod** ([incompetech.com](https://incompetech.com)),
licensed under **Creative Commons Attribution 4.0 International (CC BY 4.0)**
([license text](https://creativecommons.org/licenses/by/4.0/)).

- Source: `https://incompetech.com/music/royalty-free/mp3-royaltyfree/`
- Downloaded: 2026-09-29
- Adaptation: re-encoded from 320kbps to 128kbps MP3 for streaming (permitted under CC BY 4.0; adaptation noted here and in-app)
- Extended mixes: tracks shorter than 5 minutes were seamlessly looped (2-second crossfades)
  into ~7–9 minute "extended" versions so a focus session isn't chopped up by short tracks.
  This is an adaptation permitted under CC BY 4.0; the underlying work and licensor are unchanged.
- Files served from: `artifacts/focus-music-hub/public/audio/`
- Attribution is shown in-app under Configure → Music Credits, in the format required by the licensor:
  `[Title] Kevin MacLeod (incompetech.com) — Licensed under Creative Commons: By Attribution 4.0`

## Track list

### Focus — Progressive / Uplifting (`public/audio/focus/`)
| Title | File |
|---|---|
| Deliberate Thought | focus/Deliberate Thought.mp3 |
| Blippy Trance | focus/Blippy Trance.mp3 |
| EDM Detection Mode | focus/EDM Detection Mode.mp3 |
| Digital Lemonade | focus/Digital Lemonade.mp3 |
| Future Cha Cha | focus/Future Cha Cha.mp3 |

### Immerse — Underground / Melodic (`public/audio/immerse/`)
| Title | File |
|---|---|
| Crypto | immerse/Crypto.mp3 |
| Deep Haze | immerse/Deep Haze.mp3 |
| Echoes of Time | immerse/Echoes of Time.mp3 |
| Mirage | immerse/Mirage.mp3 |
| Sovereign | immerse/Sovereign.mp3 |

### Drift — Ambient / Downtempo (`public/audio/drift/`)
| Title | File |
|---|---|
| Tranquility Base | drift/Tranquility Base.mp3 |
| Chill Wave | drift/Chill Wave.mp3 |
| Fluidscape | drift/Fluidscape.mp3 |
| Lightless Dawn | drift/Lightless Dawn.mp3 |
| Silver Blue Light | drift/Silver Blue Light.mp3 |

## Replacing or adding tracks

1. Download from incompetech.com (verify the track page still lists CC BY 4.0).
2. Re-encode to 128kbps MP3 for consistent streaming size.
3. Add the file under `public/audio/<station>/`, register it in
   `artifacts/focus-music-hub/src/hooks/useAudio.ts` (STATIONS),
   and record it in this file with the download date.
4. Keep the in-app credits list (SettingsPanel → Music Credits) in sync.
