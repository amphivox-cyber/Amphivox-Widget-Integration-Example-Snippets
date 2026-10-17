# React component with built-in UI

[All examples](../../README.md)

The Good Measure feedback form adds voice to a three-page React form with a single `<VoiceWidget>`. This is the simplest React integration: the whole thing lives in [App.jsx](src/App.jsx) and [voice-schema.js](src/voice-schema.js), with no extra hooks or helpers. Choose it when the built-in floating microphone is all the voice UI you need.

The component reports your `page` prop for you. Your app keeps its own state, validation, navigation and submission.

## Run locally

- Install Node.js and npm.
- Sign in at [AmphiVox](https://amphivox.com/), open **Widgets**, and create a **developer-defined** key. You don't need to import or publish a form, or connect a response destination.
- Allow `http://localhost:5181` on that key.
- From this folder, copy the environment template:

```sh
cp .env.example .env.local              # macOS / Linux
Copy-Item .env.example .env.local       # Windows PowerShell
```

Set `VITE_AMPHIVOX_WIDGET_KEY=YOUR_WIDGET_KEY` in `.env.local`, then:

```sh
npm install
npm run dev
```

Open [http://localhost:5181](http://localhost:5181), choose the floating microphone, and allow microphone access. Restart Vite after changing the environment file. Without a key, the form still works by hand.

The port is strict: if 5181 is taken, Vite stops instead of picking another. To use a different port, allow that exact origin on your key and run, for example, `npm run dev -- --port 5200`. `localhost` and `127.0.0.1` are different origins.

## How the integration works

### 1. Render the component with the page on screen

```jsx
<VoiceWidget
  mode="developer-defined"
  widgetKey={widgetKey}
  schema={schema}
  page={pageSnapshot(values, step)}
  onField={onField}
  onAdvancePage={advance}
  onSessionEnd={onSessionEnd}
  onError={onError}
/>
```

`page` is a snapshot of the page on screen: its zero-based number and the value of every field on it, `null` when unanswered. `pageSnapshot()` builds it from React state, so typing by hand and voice answers are both reported, with nothing extra to call.

See [VoiceWidget props](https://amphivox.com/docs/widget/api/react#voicewidget-props) and the [React quick start](https://amphivox.com/docs/widget/react#quick-start).

### 2. Put voice answers into the same state as typing

```js
function onField(fieldId, value) {
  if (complete) return { ok: false, cause: "write" };
  if (isSkip(value)) return;
  const field = schema.fields.find((item) => item.id === fieldId);
  if (field.type === "date") value = flipDate(value);
  const problem = problemWith(field, value);
  if (problem) return { ok: false, cause: "validation", reason: problem };
  flushSync(() => set(fieldId, value));
}
```

- **Skips first.** A skip means the respondent passed on an optional field. It is not a value, so the field is left as it is.
- **Dates.** Voice dates are `DD-MM-YYYY`; a native date input uses `YYYY-MM-DD`. `flipDate()` converts both ways: here on the way in, and in `pageSnapshot()` on the way out.
- **One set of rules.** `problemWith()` checks typed answers, voice answers and submission alike. Its "no future visit dates" rule is a host rule the schema can't express, so a voice answer that breaks it is refused with `cause: "validation"` and the agent asks again.
- **`flushSync`** commits the answer at once, so a page turn or completion that follows sees it.

See [onField](https://amphivox.com/docs/widget/api/react#onfield-fieldid-value-writeid) and [refusing an answer](https://amphivox.com/docs/widget/react#refuse-an-answer).

### 3. Reuse your own Next and submit

The Continue button and `onAdvancePage` call the same `advance()`. It returns `false` when the page can't move, which tells the agent it is blocked.

`onSessionEnd` submits only when `reason` is `"complete"`, through the same `submit()` as the Send button, which checks every page first. Any other ending keeps the answers and shows a notice.

The widget stays mounted on the thank-you screen so its post-session rating can show. "Leave another note" clears the state and remounts a fresh widget.

See [handling a blocked Next](https://amphivox.com/docs/widget/react#handle-a-blocked-next) and [session endings](https://amphivox.com/docs/agents/voice-agent#endings).

## What this example leaves out

This example keeps to the minimum. These are optional, and the [hook example](../react-hook-custom-ui/README.md) or the guide covers each:

- **Remembering skips.** If the respondent stops voice and starts again, an optional field they skipped is asked again. To avoid that, send skips back through `initialValues`; see [remembering a skip](https://amphivox.com/docs/widget/react#remember-a-skip-across-sessions).
- **Your own voice controls.** Start/stop, mute, status and a transcript need `useVoiceWidget`, shown in the hook example.

## Adapt this example

- Replace [voice-schema.js](src/voice-schema.js) and the matching inputs in [App.jsx](src/App.jsx). Keep field ids, pages and option labels aligned.
- Change `problemWith()` to your own rules.
- Replace the demo confirmation in `submit()` with your backend request, and show success only once it has saved.

Try a spoken date, a future date, an invalid email, several "come back for" choices, No to follow-up, skipping an optional field, and stopping and restarting voice.

## Build and deploy

Run `npm run build`; `npm run preview` serves the build locally on the same port. Deploy with your own HTTPS hosting and allow its exact origin on the key. Vite puts the key into the browser bundle at build time, so supply it then.

The widget key is a browser-visible identifier, not a secret; `.env.local` is gitignored so your own key isn't committed. Keep the AI disclosure and your own privacy notices.

[React CSP and troubleshooting](https://amphivox.com/docs/widget/react#content-security-policy) · [Full React API](https://amphivox.com/docs/widget/api/react)
