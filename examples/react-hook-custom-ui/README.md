# React hook with custom voice UI

[All examples](../../README.md)

The Fieldnotes registration form demonstrates `useVoiceWidget` with custom start/stop and mute controls, live status and a transcript across three pages. Choose this approach when the built-in floating microphone is not the UI you want.

React owns the answers. The hook delivers callbacks and controls; it does not bind your inputs or report your page automatically.

**Live demo:** [Try the deployed React hook example](https://amphivox-widget-integration-example.onrender.com/).

## Run locally

- Install Node.js and npm.
- Sign in at [AmphiVox](https://amphivox.com/), open **Widgets**, and create a **developer-defined** key. No hosted form import, publication or response destination is needed.
- Allow `http://localhost:5180` on that key.
- From this folder, copy the environment template and edit `.env.local`:

```sh
cp .env.example .env.local              # macOS / Linux
Copy-Item .env.example .env.local       # Windows PowerShell
```

Set `VITE_AMPHIVOX_WIDGET_KEY=YOUR_WIDGET_KEY` in the copied file. If it already exists, edit it instead of copying over it.

```sh
npm install
npm run dev
```

Open [http://localhost:5180](http://localhost:5180), choose **Answer by voice**, and allow microphone access. Restart Vite after changing the environment file. A blank key leaves the manual form usable.

The port is strict: an occupied port produces an error. To use a different origin, allow that exact origin on your key and run, for example, `npm run dev -- --host localhost --port 5200 --strictPort`. Open `http://localhost:5200`; `localhost` and `127.0.0.1` are different origins.

## How the integration works

### 1. Mount one hook and connect the form callbacks

[VoiceAssistant.jsx](src/VoiceAssistant.jsx) creates one widget instance. This excerpt omits the status and transcript callbacks:

```jsx
const widget = useVoiceWidget({
  mode: "developer-defined",
  widgetKey: import.meta.env.VITE_AMPHIVOX_WIDGET_KEY.trim(),
  schema,
  hidden: true,
  initialValues: form.initialValues,
  onField: form.onField,
  onAdvancePage: advance,
  onError: form.onError,
  // Session and UI callbacks are included in the source.
});
```

`hidden: true` hides the built-in dock while keeping its iframe functional. It hides the dock's AI disclosure too, so [VoiceAssistant.jsx](src/VoiceAssistant.jsx) shows the required line beside the voice buttons: *You're speaking with an AI assistant, not a person.* Our buttons use `open`, `close`, `mute` and `unmute`; session/status callbacks drive their presentation. Muting does not end a session or suspend its timeout.

See [hook options and controls](https://amphivox.com/docs/widget/api/react#usevoicewidget-options) and [component versus hook](https://amphivox.com/docs/widget/react#component-or-hook).

### 2. Report the state the visitor actually sees

The hook requires explicit page reports. The example sends a full current-page snapshot after manual or voice edits and navigation, and again before starting:

```jsx
const snapshot = JSON.stringify(form.snapshot(step));
useEffect(() => {
  widget.reportPage(JSON.parse(snapshot));
}, [widget, snapshot]);

const open = () => {
  widget.reportPage(form.snapshot(step));
  widget.open();
};
```

[useVoiceForm.js](src/useVoiceForm.js) builds snapshots using exactly the schema ids for that page, with `null` for unanswered fields. It preserves real `false` and `0` values. Reporting edits prevents the assistant from repeating questions already answered manually.

See [reportPage](https://amphivox.com/docs/widget/api/react#reportpage-snapshot).

### 3. Apply answers through the same state and validation as typing

`onField` checks `isSkip` before processing answers, validates against the schema, then commits to controlled React state. It checks the rendered controls' native validity after the update. A rejected answer returns `{ ok: false, cause: "validation", reason }`; it is not silently treated as accepted.

Optional skips are remembered separately in `initialValues`, never stored as input values. Manual answers clear those skips. [App.jsx](src/App.jsx) routes manual Next and voice navigation through the same handler:

```jsx
const advance = () => {
  if (step >= voice.pageCount - 1 || !voice.validate(step)) return false;
  setStep((current) => current + 1);
};
```

Returning `false` tells the React integration that navigation was blocked. Only a session ending with `reason: "complete"` attempts the normal all-page validated submit. Stop, timeout and hands-off retain answers.

See [field callbacks](https://amphivox.com/docs/widget/api/react#onfield-fieldid-value-writeid), [blocked Next](https://amphivox.com/docs/widget/react#handle-a-blocked-next) and [session endings](https://amphivox.com/docs/agents/voice-agent#endings).

Transcript updates replace the line at the supplied index rather than appending every revision.

Successful submission hides our custom controls but keeps the hook and widget iframe mounted. Late field writes and duplicate submission attempts are blocked. Registering another person resets the form and remounts a fresh widget.

## Adapt this example

- Replace [voice-schema.js](src/voice-schema.js) and the matching controlled inputs in [App.jsx](src/App.jsx). Schema fields define pages, required rules, options and limits.
- Reuse or adapt [useVoiceForm.js](src/useVoiceForm.js) for your state and host validation rules; it is an example helper, not part of the SDK.
- Replace the local completion callback with your backend submission. Show confirmation only after persistence succeeds.
- Keep one mounted voice hook and the AI disclosure; customize [VoiceAssistant.jsx](src/VoiceAssistant.jsx) to your UI.

Try an invalid seat count, multiple interests, optional skips, manual corrections during voice, stop/restart and a fresh registration.

## Build and deploy

Run `npm run build`; `npm run preview` serves the build locally on the strict configured port. Deploy the build through your own HTTPS hosting and allow its exact origin on the widget key. Supply the environment value at build time: Vite includes it in the browser bundle.

`.env.local` is gitignored, not a secret vault. Widget keys are browser-visible identifiers; never put backend secrets there. Vite preview is not production hosting.

[React CSP and troubleshooting](https://amphivox.com/docs/widget/react#content-security-policy) · [Full React API](https://amphivox.com/docs/widget/api/react)
