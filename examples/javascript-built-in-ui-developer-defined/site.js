(() => {
  const form = document.querySelector("#multi-form");
  const steps = [...form.querySelectorAll(".step")];
  const back = document.querySelector("#back-button");
  const next = document.querySelector("#next-button");
  const submit = document.querySelector("#submit-button");
  const progress = document.querySelector("#progress-fill");
  const label = document.querySelector("#step-label");
  const notice = document.querySelector("#voice-notice");
  const names = ["YOUR VISIT", "YOUR DETAILS", "YOUR PREFERENCES"];
  const config = window.APPOINTMENT_VOICE_CONFIG;
  // Autofill: the SDK owns input writes, type conversion, readback, and change-event reports.
  const sdk = window.VoiceForm;
  const fieldIds = config?.schema?.fields.map((field) => field.id) ?? [];
  const skipped = new Set(); // Remember optional skips until this form is reset/reloaded.
  let current = 0;
  let initialized = false;
  let finished = false;
  let sessionActive = false;

  function showNotice(message = "") {
    notice.textContent = message;
  }
  function debug(event, detail = {}) {
    if (config?.debug) console.info("[AmphiVox · Stillwell]", event, detail);
  }
  function controlsFor(fieldId) {
    const controlName = config?.fieldMap?.[fieldId] ?? fieldId;
    return [...form.querySelectorAll("input,select,textarea")].filter(
      (control) => control.id === controlName || control.name === controlName,
    );
  }
  function hasAnswer(fieldId) {
    return controlsFor(fieldId).some((control) =>
      control.type === "checkbox" || control.type === "radio"
        ? control.checked
        : control.value.trim() !== "",
    );
  }
  function syncSkips() {
    if (initialized)
      sdk.setInitialValues(
        skipped.size
          ? Object.fromEntries([...skipped].map((id) => [id, sdk.SKIP]))
          : null,
      );
  }
  function clearSkip(fieldId) {
    if (skipped.delete(fieldId)) syncSkips();
  }
  function reportPage() {
    if (!initialized || finished) return;
    debug("reportPage", { page: current });
    // Refresh manual-only fields on every report: autofill retains these overrides.
    const values = {};
    for (const field of config.schema.fields) {
      if (field.page !== current || !field.pii) continue;
      const controls = controlsFor(field.id);
      values[field.id] =
        hasAnswer(field.id) &&
        controls.every((control) => !validationReason(control))
          ? controls[0].value
          : null;
    }
    sdk.reportPage({ page: current, values }); // The SDK reads the remaining controls.
  }
  function render() {
    steps.forEach((step, page) => {
      step.hidden = page !== current;
    });
    progress.style.width = `${((current + 1) / steps.length) * 100}%`;
    label.textContent = `0${current + 1} · ${names[current]}`;
    back.hidden = current === 0;
    next.hidden = current === steps.length - 1;
    submit.hidden = current !== steps.length - 1;
  }
  // Programmatic SDK writes don't necessarily trigger native length validation.
  function hostRuleReason(control) {
    if (
      control.name === "date" &&
      control.value &&
      control.value < control.min
    ) {
      return "Please choose today or a later appointment date.";
    }
    if (control.maxLength > 0 && control.value.length > control.maxLength) {
      return `Please keep this answer to ${control.maxLength} characters or fewer.`;
    }
    return "";
  }
  function validationReason(control) {
    const reason = hostRuleReason(control);
    if (reason) return reason;
    return control.checkValidity() ? "" : control.validationMessage;
  }
  // What the agent says when it refuses an answer. Never the browser's own
  // message: some quote the value back (a mistyped email), and the reason is
  // spoken aloud and kept in session logs.
  function spokenReason(control) {
    const hostRule = hostRuleReason(control);
    if (hostRule) return hostRule;
    const validity = control.validity;
    if (validity.valueMissing) return "This question needs an answer.";
    if (validity.typeMismatch && control.type === "email")
      return "That doesn't look like a valid email address.";
    if (validity.typeMismatch && control.type === "url")
      return "That doesn't look like a valid web address.";
    if (validity.rangeUnderflow || validity.rangeOverflow)
      return "That's outside the allowed range.";
    return "That answer isn't accepted here.";
  }
  function validatePage(page) {
    const invalid = [
      ...steps[page].querySelectorAll("input,select,textarea"),
    ].find((control) => validationReason(control));
    if (!invalid) {
      showNotice();
      return true;
    }
    current = page;
    render(); // Reveal earlier invalid fields before focusing them.
    showNotice(validationReason(invalid));
    invalid.focus();
    invalid.reportValidity();
    return false;
  }
  function advance() {
    if (finished || current >= steps.length - 1 || !validatePage(current))
      return false;
    current += 1;
    render();
    return true;
  }
  function completeForm() {
    if (finished) return;
    for (let page = 0; page < steps.length; page++) {
      if (!validatePage(page)) {
        reportPage();
        return;
      }
    }
    // This demo has no backend. Replace this confirmation with your own submission.
    const firstName = form.elements.firstName.value.trim();
    finished = true;
    // Preserve the iframe so the SDK can display post-session feedback.
    // A manual submit may happen during voice: stop that conversation, not the widget.
    if (initialized && sessionActive) sdk.close();
    skipped.clear();
    const card = document.querySelector(".booking-card");
    card.innerHTML =
      '<div class="confirmation"><span class="confirm-mark">✓</span><p class="eyebrow">REQUEST RECEIVED</p><h2></h2><button class="back" type="button">Book another session</button></div>';
    card.querySelector("h2").textContent = `We’ll be in touch, ${firstName}.`;
    card
      .querySelector("button")
      .addEventListener("click", () => window.location.reload());
  }
  const today = new Date();
  form.elements.date.min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  next.addEventListener("click", () => {
    advance();
    reportPage();
  });
  back.addEventListener("click", () => {
    current = Math.max(0, current - 1);
    render();
    reportPage();
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    completeForm();
  });
  form.addEventListener("input", (event) => {
    for (const id of fieldIds)
      if (controlsFor(id).includes(event.target) && hasAnswer(id))
        clearSkip(id);
    // Refresh host overrides while typing as well as on committed changes.
    reportPage();
  });
  form.addEventListener("change", (event) => {
    for (const id of fieldIds)
      if (controlsFor(id).includes(event.target) && hasAnswer(id))
        clearSkip(id);
    reportPage();
  });
  render();

  if (!config?.widgetKey?.trim()) return; // Manual form still works without a key.
  if (!sdk) {
    showNotice(
      "Voice could not load. You can still fill in this form by hand.",
    );
    return;
  }
  try {
    sdk.init({
      mode: "developer-defined",
      widgetKey: config.widgetKey.trim(),
      schema: config.schema,
      target: "#multi-form",
      language: "en-IN",
      onField: (fieldId, value, writeId) => {
        // Submitted: there is no form to write into any more.
        if (finished) return { ok: false, cause: "write" };
        debug("onField", { fieldId, writeId, skipped: value === sdk.SKIP });
        // With target, the SDK has already written normal answers. Don't write twice.
        if (value === sdk.SKIP) {
          const controls = controlsFor(fieldId);
          if (
            controls.length &&
            controls.every((control) => !control.required)
          ) {
            skipped.add(fieldId);
            syncSkips();
          }
          return;
        }
        if (hasAnswer(fieldId)) clearSkip(fieldId);
        const invalid = controlsFor(fieldId).find((control) =>
          validationReason(control),
        );
        if (invalid) {
          // Keep reporting the actual DOM value; do not clear a refused answer silently.
          // On screen, the browser's message; spoken, one that never quotes the value.
          showNotice(validationReason(invalid));
          return {
            ok: false,
            cause: "validation",
            reason: spokenReason(invalid),
          };
        }
        showNotice();
      },
      onAdvancePage: () => {
        const moved = advance();
        reportPage(); // New page, or unchanged page before reporting a blocked turn.
        if (!moved) {
          debug("advanceBlocked", { page: current });
          sdk.reportAdvanceBlocked();
        }
      },
      onSessionStart: () => {
        sessionActive = true;
        if (finished) {
          sdk.close();
          return;
        }
        showNotice();
        debug("sessionStarted", { page: current });
      },
      onSessionEnd: (ending) => {
        sessionActive = false;
        if (finished) return;
        debug("sessionEnded", { reason: ending.reason });
        switch (ending.reason) {
          case "complete":
            completeForm();
            break;
          case "hands_off":
            showNotice(
              "Please finish the remaining fields by hand, then submit.",
            );
            break;
          case "timeout":
            showNotice("Voice timed out. Your answers are still here.");
            break;
          case "manual":
            showNotice("Voice stopped. Your answers are still here.");
            break;
          case "error":
            showNotice(
              "Voice stopped working. You can finish this form by hand.",
            );
            break;
          default:
            showNotice("Your answers are still here. You can finish by hand.");
        }
      },
      onError: ({ code, message }) => {
        if (finished) return;
        debug("error", { code });
        switch (code) {
          case "session_busy":
          case "session_limit_exceeded":
            showNotice("Voice is busy. Please try again shortly.");
            break;
          case "widget_not_ready":
            showNotice("Voice is still loading. Please try again in a moment.");
            break;
          default:
            showNotice(message);
        }
      },
    });
    initialized = true;
    window.addEventListener("pagehide", () => {
      if (!initialized) return;
      initialized = false;
      sdk.destroy();
    });
    reportPage(); // Required before the first session; queued until the iframe loads.
  } catch (error) {
    showNotice(
      "Voice could not initialize. You can still fill in this form by hand.",
    );
    debug("initializationFailed", { message: error.message });
  }
})();
