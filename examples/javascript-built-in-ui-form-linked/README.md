# JavaScript with built-in UI — form-linked

[All examples](../../README.md)

The Northstar job application demonstrates mapping an existing AmphiVox form onto a three-page HTML form. Choose this approach when the schema is already managed in AmphiVox rather than in your application code.

The built-in dock provides the voice controls. The SDK reads and fills your HTML inputs through `target` and `fieldMap`, without an `onField` callback. The host validates on Next and submission and owns navigation. The [developer-defined example](../javascript-built-in-ui-developer-defined/README.md) adds per-answer validation and optional skip memory through `onField`.

## Run locally

- Install Python 3; no npm dependencies or bundler are required.
- Sign in at [AmphiVox](https://amphivox.com/), open **Widgets**, and use a **form-linked** key for a form with the fields in [the table below](#keep-the-linked-field-contract-aligned). Unlike the developer-defined examples, this requires an existing AmphiVox form.
- Allow `http://localhost:5193` on that key.
- Put your form's field ids into the `fieldMap` in `voice-config.js`. [Where to find the field ids](#where-to-find-the-field-ids) shows where AmphiVox lists them.
- From this folder, create your local configuration:

```sh
cp voice-config.example.js voice-config.local.js          # macOS / Linux
Copy-Item voice-config.example.js voice-config.local.js   # Windows PowerShell
```

Edit **`voice-config.local.js`**, setting `widgetKey` to your form-linked key. This is a manual, one-time copy; if the file exists, edit it instead. Do not put the key in `voice-config.js` or `voice-config.example.js`; the browser does not load the template.

```sh
python -m http.server 5193 --bind localhost
```

Open [http://localhost:5193](http://localhost:5193), choose the floating microphone, and allow microphone access. Python serves the files; the integration runs in the browser.

An occupied port produces an error. For another origin, allow that exact origin and run, for example, `python -m http.server 5200 --bind localhost`; open `http://localhost:5200`. `localhost` differs from `127.0.0.1`.

## How the integration works

### 1. Connect the remote schema to local controls

[index.html](index.html) loads `https://amphivox.com/widget.js` with `crossorigin`, then `voice-config.local.js`, `voice-config.js` and `site.js`, in that order.

[voice-config.js](voice-config.js) reads the local key and defines the mapping. One deliberately renamed field demonstrates its direction:

```js
fieldMap: {
  first_name: "applicantFirstName",
  // Remaining AmphiVox field ids map to local control names.
},
```

In [site.js](site.js), initialization uses:

```js
mode: "form-linked",
widgetKey: config.widgetKey.trim(),
fieldMap: config.fieldMap,
target: "#your-form",
language: "en-IN",
```

These are options inside `sdk.init()`, where `sdk` is `window.VoiceForm`. There is no code-owned `schema` option: the key identifies the remote form.

See [JavaScript integration guide](https://amphivox.com/docs/widget/javascript) and [init options](https://amphivox.com/docs/widget/api/javascript#voiceform-init-options).

### 2. Let the SDK read and fill your inputs

The host reports the page on load, navigation and manual input/change events. The SDK reads mapped controls and converts dates. For manual-only contact and portfolio fields, the host supplies current-page `values` overrides: an accepted nonempty value, or `null` if empty or invalid. These overrides are refreshed on every report, including after clearing a field, because autofill retains them for the current page. The SDK masks manual-only contents before sending them outside the browser. No field callback is needed for autofill.

Contact fields marked PII and the portfolio URL stay manual. Optional skips are not persisted across sessions, so restarting voice can ask those questions again. This example does not refuse individual voice answers: native constraints and the project story's minimum 20 characters are checked by `validationReason()` when Next or submit runs. The story minimum is a host rule, not a schema property.

See [page reports](https://amphivox.com/docs/widget/api/javascript#voiceform-reportpage-snapshot) and [manual-only field behavior](https://amphivox.com/docs/agents/voice-agent).

### 3. Use the host's Next and submit

`onAdvancePage` invokes the same validated `advance()` as manual Next, reports the resulting page and calls `sdk.reportAdvanceBlocked()` if it did not move.

Only a session ending of `complete` attempts `completeForm()`. It rechecks all pages and shows a local confirmation while retaining the widget iframe for post-session feedback. A manual submit during voice closes the conversation without destroying the widget. Navigation and page reports stop after submission; a new application reloads the page, and page exit destroys the widget. Other endings retain answers; voice does not upload or persist this application.

See [blocked Next](https://amphivox.com/docs/widget/javascript#handle-a-blocked-next) and [session endings](https://amphivox.com/docs/agents/voice-agent#endings).

This form contains manual-only fields, so its voice sessions end with `hands_off`, even if the respondent has filled those fields. The visitor reviews the application and submits with the form's own button. Do not treat `hands_off` as permission to submit automatically.

## Keep the linked field contract aligned

Your AmphiVox form needs these fields, on these pages, with these rules. The ids are the ones this example's `fieldMap` uses; yours come from your labels and are mapped as shown in [Where to find the field ids](#where-to-find-the-field-ids).

| Page | AmphiVox field ids                      | Rules                              |
| ---- | --------------------------------------- | ---------------------------------- |
| 0    | first_name, last_name                   | str, required, PII                 |
| 0    | email_address                           | email, required, PII               |
| 0    | phone_number                            | phone, optional, PII               |
| 1    | position, work_location                 | enum, required; match HTML options |
| 1    | earliest_start_date                     | date, required                     |
| 1    | portfolio_or_linkedin_link              | url, required; manual-only         |
| 2    | tell_us_about_a_project_you_re_proud_of | long, required, maxLength 1000     |
| 2    | what_kind_of_work_gives_you_energy      | enum, required; match HTML options |

A dashboard schema edit does not update your HTML. Keep both aligned before starting another session.

### Where to find the field ids

You don't choose a field id. AmphiVox makes one from the field's label, so the ids in your form may differ from the table above. Either of these places shows the ids your form actually has:

- **Your widget's page.** Open **Widgets**, select your widget, and go to **Add it to your site** → **Vanilla JS**. The snippet there has a `fieldMap` listing every field id, grouped by page.
- **The form editor.** Each field shows _Your site refers to this field as_ followed by its id.

Copy each id into `fieldMap` in [voice-config.js](voice-config.js) as the key, with the local control's `name` as the value. The keys change; the values stay as they are, because they're the names in [index.html](index.html):

```js
fieldMap: {
  first_name: "applicantFirstName", // your form's id: this page's control name
  last_name: "last_name",
  // ...one entry per field
},
```

An entry in `fieldMap` is only required when the field id differs from the control's `id` or `name`. Otherwise, the SDK finds the matching control automatically. An explicit mapping that matches no control does not fall back to the field id. This example lists all fields explicitly so its manual-only readback can also resolve them. Renaming a field's label changes its id; update the mappings after saving.

The options of `position`, `work_location` and `what_kind_of_work_gives_you_energy` must match the `<option>` labels in [index.html](index.html) exactly. `fieldMap` maps field ids, not option values.

## Adapt this example

- Update the remote form, [fieldMap](voice-config.js) and [HTML controls](index.html) together.
- Adapt host rules in [site.js](site.js), particularly the story minimum.
- Keep `manualControls` in [site.js](site.js) aligned with the local control names for your linked form's PII and URL fields.
- Replace `completeForm()`'s local confirmation with your backend submission; show success only after it succeeds.
- Use the [developer-defined built-in UI example](../javascript-built-in-ui-developer-defined/README.md) if you want the schema solely in your code.

Try manual contact/portfolio completion, a short story, date edits, optional skips, backward navigation and stop/restart.

## Configuration and deployment

`voice-config.local.js` is gitignored; the key is nevertheless visible in the browser and is not a backend secret. Missing or blank keys keep manual use available; a missing file also produces a browser 404.

Provision the local configuration file on your production host without committing it, serve over HTTPS and allow the exact origin. Keep the AI disclosure and privacy notices. Python's development server is not production hosting.

[JavaScript CSP and troubleshooting](https://amphivox.com/docs/widget/javascript#content-security-policy) · [Full JavaScript API](https://amphivox.com/docs/widget/api/javascript)
