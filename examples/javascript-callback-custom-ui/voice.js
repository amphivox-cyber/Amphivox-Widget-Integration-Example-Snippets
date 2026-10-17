// Callback mode: NO target or fieldMap. The host owns all writes and snapshots.
(function () {
  "use strict";
  const sdk = window.VoiceForm;
  const config = window.CAFE_VOICE_CONFIG;
  const form = document.getElementById("feedback-form");
  const status = document.getElementById("voice-status");
  const start = document.getElementById("voice-start");
  const stop = document.getElementById("voice-stop");
  const mute = document.getElementById("voice-mute");
  const transcript = document.getElementById("voice-transcript");
  const panel = document.getElementById("voice-panel");
  const startLabel = document.getElementById("voice-start-label");
  const muteLabel = document.getElementById("voice-mute-label");
  let active = false,
    starting = false,
    muted = false,
    thinking = false,
    speaking = false,
    submitted = false,
    destroyed = false;
  let lines = [];
  if (!sdk || !config || !config.widgetKey.trim()) {
    status.textContent = !sdk
      ? "Voice couldn't load. You can still fill in the form."
      : "Voice is not configured. You can still fill in the form.";
    return;
  }

  function report() {
    if (destroyed || submitted) return;
    const values = {};
    config.schema.fields.forEach(function (field) {
      const text = document.getElementById(field.id).value.trim();
      values[field.id] = text || null;
    });
    sdk.reportPage({ page: 0, values: values });
  }
  function render() {
    start.hidden = active;
    stop.hidden = !active;
    start.disabled = active || starting || destroyed || submitted;
    start.setAttribute("aria-busy", String(starting));
    startLabel.textContent = starting ? "Connecting…" : "Answer by voice";
    stop.disabled = !active;
    mute.disabled = !active;
    muteLabel.textContent = active && muted ? "Unmute" : "Mute";
    mute.setAttribute(
      "aria-label",
      active && muted ? "Unmute microphone" : "Mute microphone",
    );
    mute.setAttribute("aria-pressed", String(active && muted));
    panel.setAttribute(
      "data-state",
      submitted
        ? "complete"
        : starting
          ? "connecting"
          : !active
            ? "idle"
            : muted
              ? "muted"
              : speaking
                ? "speaking"
                : thinking
                  ? "thinking"
                  : "listening",
    );
    status.textContent = submitted
      ? "Demo complete. Start another note to reset."
      : starting
        ? "Connecting to your voice assistant…"
        : active
          ? muted
            ? "Microphone muted (the session can still time out)."
            : speaking
              ? "Assistant speaking…"
              : thinking
                ? "Thinking…"
                : "Listening…"
          : "Choose Answer by voice, or continue typing.";
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    active = false;
    starting = false;
    sdk.destroy();
    render();
    status.textContent = "Demo complete. Start another note to reset.";
  }
  function complete() {
    if (submitted) return;
    submitted = true;
    // Stop a live conversation after manual submit, but retain the iframe.
    if (active) sdk.close();
    render();
  }
  try {
    sdk.init({
      mode: "developer-defined",
      widgetKey: config.widgetKey.trim(),
      schema: config.schema,
      hidden: true,
      language: "en-IN",
      onField: function (fieldId, value) {
        // All three fields are required; never write a skip marker into an input.
        if (value === sdk.SKIP) return;
        const field = config.schema.fields.find(function (item) {
          return item.id === fieldId;
        });
        if (!field || destroyed || submitted)
          return { ok: false, cause: "write" };
        const text = typeof value === "string" ? value.trim() : "";
        // The agent speaks the reason, so say exactly what is wrong.
        if (!text) {
          return {
            ok: false,
            cause: "validation",
            reason: "This question needs an answer.",
          };
        }
        if (text.length > field.maxLength) {
          return {
            ok: false,
            cause: "validation",
            reason:
              "Please keep this answer to " +
              field.maxLength +
              " characters or fewer.",
          };
        }
        const control = document.getElementById(fieldId);
        // Assignment, not append: repeated write ids do not duplicate answers.
        control.value = text;
        control.dispatchEvent(new Event("input", { bubbles: true }));
        report();
      },
      onAdvancePage: function () {
        // A one-page form has no Next. Submission belongs to complete, not advance.
        report();
        sdk.reportAdvanceBlocked();
      },
      onSessionStart: function () {
        starting = false;
        if (submitted) {
          sdk.close();
          return;
        }
        active = true;
        muted = false;
        lines = [];
        transcript.replaceChildren();
        render();
      },
      onSessionEnd: function (ending) {
        starting = false;
        active = false;
        thinking = false;
        speaking = false;
        render();
        if (submitted) return;
        switch (ending.reason) {
          case "complete":
            form.requestSubmit(); // Same host validation as manual submission.
            if (!destroyed && !submitted) {
              report();
              status.textContent =
                "Please finish the highlighted fields manually.";
            }
            break;
          case "hands_off":
            status.textContent =
              "Please continue on the form. Your answers are retained.";
            break;
          case "manual":
            status.textContent = "Voice stopped. Your answers are retained.";
            break;
          case "timeout":
            status.textContent =
              "Voice timed out. Continue typing or restart voice.";
            break;
          case "error":
            status.textContent =
              "Voice ended with an error. Continue typing or retry.";
            break;
          default:
            status.textContent = "Voice ended. Your answers are retained.";
        }
      },
      onMuteChange: function (value) {
        muted = value;
        render();
      },
      onThinking: function (value) {
        thinking = value;
        render();
      },
      onSpeaking: function (who, value) {
        if (who === "bot") {
          speaking = value;
          render();
        }
      },
      onTranscript: function (speaker, text, index) {
        lines[index] = { speaker: speaker, text: text };
        transcript.replaceChildren();
        lines.forEach(function (line) {
          const item = document.createElement("li");
          item.textContent =
            (line.speaker === "bot" ? "Assistant: " : "You: ") + line.text;
          transcript.appendChild(item); // textContent: transcript text is never HTML.
        });
      },
      onError: function (error) {
        if (submitted) return;
        starting = false;
        render();
        panel.setAttribute("data-state", "unavailable");
        switch (error.code) {
          case "widget_not_ready":
            status.textContent = "Voice is loading. Try again shortly.";
            break;
          case "session_busy":
          case "session_limit_exceeded":
            status.textContent =
              "Voice is busy right now. Please try again in a moment.";
            break;
          default:
            status.textContent =
              "Voice unavailable (" + error.code + "). You can still type.";
        }
      },
    });
    report();
    render();
    start.addEventListener("click", function () {
      if (submitted || destroyed || starting || active) return;
      starting = true;
      render();
      report();
      sdk.open();
    });
    stop.addEventListener("click", function () {
      sdk.close();
    });
    mute.addEventListener("click", function () {
      if (muted) sdk.unmute();
      else sdk.mute();
    });
    form.addEventListener("input", report); // Includes programmatic starter-chip edits.
    form.addEventListener("change", report);
    form.addEventListener("demo:submitted", complete);
    window.addEventListener("pagehide", destroy);
  } catch (error) {
    status.textContent = "Voice could not initialize. You can still type.";
  }
})();
