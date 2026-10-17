# AmphiVox voice-form integration examples

[AmphiVox](https://amphivox.com/) lets people answer forms by speaking with an AI assistant. The assistant interprets spoken answers into structured fields. Its web widget can add that experience to an existing form without replacing the application's UI.

This repository shows five ways to integrate voice into your own React or plain JavaScript form. Each example keeps manual editing, validation, navigation and submission in the host application. They are standalone demos, not a shared framework; their confirmations do not save data or call a backend.

**Live demo:** [React hook with custom UI](https://amphivox-widget-integration-example.onrender.com/).

## Choose an example

| Example | Integration lesson |
| --- | --- |
| [React hook with custom UI](examples/react-hook-custom-ui/README.md) | Build your own voice UI with `useVoiceWidget`, apply answers to React state, and explicitly report page snapshots. |
| [React component with built-in UI](examples/react-component-built-in-ui/README.md) | Use one `VoiceWidget` with built-in voice controls and report React state through its `page` prop. |
| [JavaScript with built-in UI — developer-defined](examples/javascript-built-in-ui-developer-defined/README.md) | Define the schema in code, autofill native inputs through `target`, and use `onField` for validation and remembering optional skips. |
| [JavaScript with built-in UI — form-linked](examples/javascript-built-in-ui-form-linked/README.md) | Use a remote schema and `target`/`fieldMap` autofill without `onField`; validate at page navigation and submission. |
| [JavaScript callbacks with custom UI](examples/javascript-callback-custom-ui/README.md) | Build your own voice UI, write answers into controls in callbacks, and explicitly report current values. |

We showcase one form-linked example in JavaScript. React also supports form-linked integration: use a form-linked key, set `mode="form-linked"`, and omit the `schema` prop. Your fields and pages must match the linked form.

Built-in versus custom UI describes the voice controls. Developer-defined versus form-linked describes where the schema lives: your code or AmphiVox. The JavaScript examples also show both ways answers reach your inputs: [autofill](https://amphivox.com/docs/widget/javascript#autofill), where the SDK fills them, and [callbacks](https://amphivox.com/docs/widget/javascript#fill-them-yourself), where your code does.

Each linked README includes key setup, exact run commands, code walkthroughs and adaptation notes. React uses Node.js/npm; the plain JavaScript examples use Python 3 only to serve static files. Voice requires your own correctly configured widget key and microphone permission. All forms remain usable manually without a key.

## Official resources

[Product overview](https://amphivox.com/) · [JavaScript guide](https://amphivox.com/docs/widget/javascript) · [React guide](https://amphivox.com/docs/widget/react) · [Voice-agent contract](https://amphivox.com/docs/agents/voice-agent)

These examples demonstrate embedded integrations, not AmphiVox's hosted-form response destinations. Before production use, add your own persistence, privacy notices and HTTPS hosting.

## License

The example code is available under the [MIT License](LICENSE). Dependencies retain their own licenses; use of the AmphiVox service is governed by its [Terms of Service](https://amphivox.com/terms).
