# JavaScript callbacks with custom voice UI

[All examples](../../README.md)

Mario's Café feedback form demonstrates a single-page, callback-based integration with custom start/stop and mute buttons, status indicators and a transcript. Choose this when your application needs to control how answers are applied instead of letting the SDK write native inputs.

A callback is a function the SDK invokes when an event happens. Here `onField` receives an answer; the host validates it, writes it to a textarea and reports the resulting values. No `target` or `fieldMap` is passed.

## Run locally

- Install Python 3; no npm dependencies or bundler are required.
- Sign in at [AmphiVox](https://amphivox.com/), open **Widgets**, and create a **developer-defined** key. No hosted form import, publication or response destination is needed.
- Allow `http://localhost:5194` on that key.
- From this folder, create your local configuration:

```sh
cp voice-config.example.js voice-config.local.js          # macOS / Linux
Copy-Item voice-config.example.js voice-config.local.js   # Windows PowerShell
```

Edit **`voice-config.local.js`**, setting `widgetKey` to your key. This is a manual, one-time copy; if the file exists, edit it instead. Do not put a key in `voice-config.js` or `voice-config.example.js`. The browser does not load the template.

```sh
python -m http.server 5194 --bind localhost
```

Open [http://localhost:5194](http://localhost:5194), choose **Answer by voice**, and allow microphone access. Python serves the files; the integration runs in the browser.

An occupied port produces an error. For another origin, allow that exact origin and run, for example, `python -m http.server 5200 --bind localhost`; open `http://localhost:5200`. `localhost` differs from `127.0.0.1`.

## How the integration works

### 1. Initialize with your own voice controls

[index.html](index.html) loads the production SDK, local key, shared config and voice integration in this order:

```html
<script src="https://amphivox.com/widget.js" crossorigin></script>
<script src="./voice-config.local.js"></script>
<script src="./voice-config.js"></script>
<script src="./voice.js"></script>
```

[voice-config.js](voice-config.js) reads the local key and defines three required long-text fields. [voice.js](voice.js) calls `sdk.init()`, where `sdk` is `window.VoiceForm`, with `mode: "developer-defined"`, the key, schema and `hidden: true`.

Without `target`, the SDK does not read or write these textareas. `hidden: true` parks its dock off screen while preserving a functional iframe; do not hide the iframe using `display: none`. With the dock hidden, its AI disclosure is hidden too, so [index.html](index.html) shows the required line beside the voice buttons: *You're speaking with an AI assistant, not a person.*

See [init options](https://amphivox.com/docs/widget/api/javascript#voiceform-init-options) and [custom controls](https://amphivox.com/docs/widget/javascript#build-your-own-ui).

### 2. Validate and apply incoming answers

The `onField` callback checks `sdk.SKIP` first, resolves the field and enforces its non-empty/maxLength rules. Unknown fields return a write refusal; invalid answers return a validation refusal.

For accepted text, the source applies:

```js
const control = document.getElementById(fieldId);
control.value = text;
control.dispatchEvent(new Event("input", { bubbles: true }));
report();
```

Assignment rather than appending prevents a repeated answer from duplicating text. The input event updates the host's counters; the page report tells the assistant what actually landed. All three fields are required, so this example does not need optional skip memory.

See [onField](https://amphivox.com/docs/widget/api/javascript#onfield-fieldid-value-writeid) and [refusals](https://amphivox.com/docs/widget/javascript#refuse-an-answer).

### 3. Explicitly report the whole page

Because the application owns the input updates, it must also report the current values:

```js
const values = {};
config.schema.fields.forEach(function (field) {
  const text = document.getElementById(field.id).value.trim();
  values[field.id] = text || null;
});
sdk.reportPage({ page: 0, values: values });
```

`report()` runs on initialization, after voice writes, after manual and starter-chip edits, and before `sdk.open()`. Every snapshot includes all three field ids, using `null` for unanswered text. The assistant should not work from a partial or stale copy of the form.

See [reportPage](https://amphivox.com/docs/widget/api/javascript#voiceform-reportpage-snapshot).

### 4. Drive the UI from session callbacks

Buttons call `open`, `close`, `mute` and `unmute`. `onSessionStart`, `onSessionEnd`, `onThinking`, `onSpeaking` and `onMuteChange` update status and controls. Mute does not stop the session or its timeout.

`onTranscript` replaces `lines[index]` for each revision and renders text with `textContent`, never as HTML.

Only `reason: "complete"` attempts `form.requestSubmit()`, reusing host validation. Other endings retain answers. [site.js](site.js) handles the local confirmation and emits `demo:submitted`; [voice.js](voice.js) uses that event to mark the form submitted, disable new voice starts and close any active conversation without destroying the iframe. Page reports and late writes stop after submission. The widget is destroyed on page exit; leaving another note reloads the page.

This one-page form does not normally receive a page-turn callback. Its defensive handler reports the unchanged page and calls `reportAdvanceBlocked()`.

See [live status callbacks](https://amphivox.com/docs/widget/api/javascript#live-status-callbacks) and [session endings](https://amphivox.com/docs/agents/voice-agent#endings).

## Adapt this example

- Replace the schema in [voice-config.js](voice-config.js) and textareas in [index.html](index.html).
- Adapt `onField` and `report()` in [voice.js](voice.js) if you introduce other field types or an external state store.
- Replace [site.js](site.js)'s local submit confirmation with your backend request; confirm only after it succeeds.
- Keep callbacks and manual editing on the same source of truth. Choose the [built-in UI example](../javascript-built-in-ui-developer-defined/README.md) if [autofill](https://amphivox.com/docs/widget/javascript#autofill) suits your form instead.

Try empty/oversized answers, manual and starter-chip edits, transcript revisions, mute/unmute, stop/restart and incomplete submission.

## Configuration and deployment

`voice-config.local.js` is gitignored. Missing or blank keys leave the manual form usable; a missing file also produces a browser 404. Keys are browser-visible identifiers, not backend secrets.

Provision the local configuration file on your HTTPS production host without committing it and allow the exact production origin. Keep the AI disclosure and privacy notices. Python's development server is not production hosting. The café uses Tailwind's browser CDN for demo styling; compile its utility CSS before production.

[JavaScript CSP and troubleshooting](https://amphivox.com/docs/widget/javascript#content-security-policy) · [Full JavaScript API](https://amphivox.com/docs/widget/api/javascript)
