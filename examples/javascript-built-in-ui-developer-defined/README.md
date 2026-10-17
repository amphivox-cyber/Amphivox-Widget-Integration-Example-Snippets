# JavaScript with built-in UI — developer-defined

[All examples](../../README.md)

The Stillwell appointment form demonstrates the built-in voice controls alongside three pages of native HTML inputs. Choose this approach when your form schema lives in your code and you want the SDK to read and write the controls.

Passing `target` tells the SDK to read and fill your HTML inputs. This is called [autofill](https://amphivox.com/docs/widget/javascript#autofill). The built-in dock provides the voice controls. Your application retains validation, navigation and submission; `onField` validates answers after autofill and remembers optional skips separately.

## Run locally

- Install Python 3; no npm dependencies or bundler are required.
- Sign in at [AmphiVox](https://amphivox.com/), open **Widgets**, and create a **developer-defined** key. No hosted form import, publication or response destination is needed.
- Allow `http://localhost:5192` on that key.
- From this folder, create your local configuration:

```sh
cp voice-config.example.js voice-config.local.js          # macOS / Linux
Copy-Item voice-config.example.js voice-config.local.js   # Windows PowerShell
```

Edit **`voice-config.local.js`**, setting `widgetKey` to your key. This is a manual, one-time copy; if the file exists, edit it instead. Do not put a key in `voice-config.js` or `voice-config.example.js`: the browser does not load the template, and both are tracked.

```sh
python -m http.server 5192 --bind localhost
```

Open [http://localhost:5192](http://localhost:5192), choose the floating microphone, and allow microphone access. Python only serves the files; the integration runs in the browser.

An occupied port produces an error. For another origin, allow that exact origin and run, for example, `python -m http.server 5200 --bind localhost`; open `http://localhost:5200`. `localhost` differs from `127.0.0.1`.

## How the integration works

### 1. Load configuration and connect your form

[index.html](index.html) loads the production SDK and then the local key, shared schema and application:

```html
<script src="https://amphivox.com/widget.js" crossorigin></script>
<script src="./voice-config.local.js"></script>
<script src="./voice-config.js"></script>
<script src="./site.js"></script>
```

[voice-config.js](voice-config.js) reads `window.AMPHIVOX_LOCAL_CONFIG?.widgetKey ?? ""` and defines the three-page schema. Its ids match the HTML control names.

[site.js](site.js) initializes the widget with these options (callback bodies omitted):

```js
sdk.init({
  mode: "developer-defined",
  widgetKey: config.widgetKey.trim(),
  schema: config.schema,
  target: "#multi-form",
  language: "en-IN",
  // Field, navigation, session and error callbacks follow in the source.
});
```

Here `sdk` is `window.VoiceForm`. The target tells it which form to read and fill. The phone number is marked PII (personally identifiable information), so it stays manual and is masked before leaving the browser; the assistant can fill additional notes.

See [JavaScript quick start](https://amphivox.com/docs/widget/javascript#quick-start) and [init options](https://amphivox.com/docs/widget/api/javascript#voiceform-init-options).

### 2. Report the current page, not duplicate values

The host reports the initial page, navigation and manual typing through:

```js
sdk.reportPage({ page: current, values });
```

The SDK reads the mapped controls and converts their values, including native dates. `values` contains only the current page's manual-only phone number: an accepted nonempty value or `null` if empty or invalid. The host refreshes that override on every report, including after clearing it, because autofill retains overrides for the current page. The manual-only value is masked by the SDK before leaving the browser. The host does not build a second snapshot of the other fields or perform its own date conversion.

See [reportPage](https://amphivox.com/docs/widget/api/javascript#voiceform-reportpage-snapshot).

### 3. Validate after the SDK writes

With `target`, ordinary answers are already written when `onField` runs. Our callback handles skip markers first, then checks native constraints and the host's today-or-later appointment rule. Invalid values return a validation refusal; the callback does not write a second time.

Optional skips are tracked separately using `setInitialValues`. Manual answers clear those markers.

See [refusing an answer](https://amphivox.com/docs/widget/javascript#refuse-an-answer) and [remembering skips](https://amphivox.com/docs/widget/javascript#remember-a-skip-across-sessions).

### 4. Let the host decide navigation and completion

The voice callback uses the same `advance()` as manual Next:

```js
onAdvancePage: () => {
  const moved = advance();
  reportPage();
  if (!moved) {
    debug("advanceBlocked", { page: current });
    sdk.reportAdvanceBlocked();
  }
},
```

Report the page whether navigation succeeds or stays blocked. Unlike the React wrapper, plain JavaScript needs an explicit `reportAdvanceBlocked()` call.

Only `reason: "complete"` attempts `completeForm()`. That function revalidates every page and replaces the form with a local confirmation while retaining the widget iframe for post-session feedback. A manual submit during voice closes the conversation without destroying the widget. Completed-form callbacks are guarded; a new booking reloads the page, and page exit destroys the widget. Other endings retain answers for manual completion.

See [blocked Next](https://amphivox.com/docs/widget/javascript#handle-a-blocked-next) and [session endings](https://amphivox.com/docs/agents/voice-agent#endings).

This form contains a manual-only PII phone number, so its voice sessions end with `hands_off`, even if that field has been filled. The visitor reviews the appointment and submits with the form's own button. Do not submit automatically on `hands_off`.

## Adapt this example

- Replace the schema in [voice-config.js](voice-config.js) and corresponding controls in [index.html](index.html); keep field ids, pages and option labels aligned.
- Adapt `validationReason()` and `validatePage()` in [site.js](site.js) for your business rules.
- Replace `completeForm()`'s demo confirmation with your backend request and show success only after it succeeds.
- Keep autofill; use the [custom UI example](../javascript-callback-custom-ui/README.md) if your application must own writes.

Try a past date, a valid future date, multiple preferences, No to reminders, optional skips, manual edits during voice and blocked Next.

## Configuration and deployment

`voice-config.local.js` is gitignored. Missing or blank keys leave the manual form usable; a missing file also produces a browser 404. Keys are browser-visible identifiers, not backend secrets.

For production, provision the local configuration file on your host without committing it, use HTTPS and allow the exact production origin. Keep the AI disclosure and your privacy notices. Python's development server is not production hosting.

[JavaScript CSP and troubleshooting](https://amphivox.com/docs/widget/javascript#content-security-policy) · [Full JavaScript API](https://amphivox.com/docs/widget/api/javascript)
