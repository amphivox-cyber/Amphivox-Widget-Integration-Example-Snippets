(() => {
  const form = document.querySelector("#your-form");
  const steps = [...form.querySelectorAll(".step")];
  const back = document.querySelector("#back-button");
  const next = document.querySelector("#next-button");
  const submit = document.querySelector("#submit-button");
  const progress = document.querySelector("#progress-fill");
  const label = document.querySelector("#step-label");
  const notice = document.querySelector("#voice-notice");
  const names = ["ABOUT YOU", "THE ROLE", "YOUR STORY"];
  const config = window.JOB_APPLICATION_VOICE_CONFIG;
  // Autofill: the SDK owns input writes, type conversion, readback, and change-event reports.
  const sdk = window.VoiceForm;
  const fieldIds = Object.keys(config?.fieldMap ?? {});
  // Local names stay stable when linked ids change. Keep dashboard contact fields PII.
  const manualControls = new Set([
    "applicantFirstName",
    "last_name",
    "email_address",
    "phone_number",
    "portfolio_or_linkedin_link",
  ]);
  let current = 0;
  let initialized = false;
  let finished = false;
  let sessionActive = false;

  function showNotice(message = "") {
    notice.textContent = message;
  }
  function debug(event, detail = {}) {
    if (config?.debug) console.info("[AmphiVox · Northstar]", event, detail);
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
  function reportPage() {
    if (!initialized || finished) return;
    debug("reportPage", { page: current });
    const pageControls = [
      ...steps[current].querySelectorAll("input,select,textarea"),
    ];
    const values = {};
    for (const id of fieldIds) {
      const controls = controlsFor(id);
      if (
        !controls.some(
          (control) =>
            pageControls.includes(control) && manualControls.has(control.name),
        )
      )
        continue;
      // Refresh valid, invalid and cleared values: autofill retains host overrides.
      values[id] =
        hasAnswer(id) && controls.every((control) => !validationReason(control))
          ? controls[0].value
          : null;
    }
    sdk.reportPage({ page: current, values }); // The SDK reads the remaining controls.
  }
  function render() {
    steps.forEach((step, page) => {
      step.hidden = page !== current;
    });
    document.querySelectorAll("#step-list li").forEach((item, page) => {
      item.classList.toggle("current", page === current);
      item.classList.toggle("complete", page < current);
    });
    progress.style.width = `${((current + 1) / steps.length) * 100}%`;
    label.textContent = `0${current + 1} / ${names[current]}`;
    back.hidden = current === 0;
    next.hidden = current === steps.length - 1;
    submit.hidden = current !== steps.length - 1;
  }
  // Programmatic SDK writes don't necessarily trigger native length validation.
  function hostRuleReason(control) {
    if (
      control.name === "tell_us_about_a_project_you_re_proud_of" &&
      control.value.trim().length < 20
    ) {
      return "Please describe the project in at least 20 characters.";
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
    const firstName = form.elements.applicantFirstName.value.trim();
    finished = true;
    // Preserve the iframe so the SDK can display post-session feedback.
    // A manual submit may happen during voice: stop that conversation, not the widget.
    if (initialized && sessionActive) sdk.close();
    const card = document.querySelector(".form-panel");
    card.innerHTML =
      '<div class="submitted"><span class="success-mark">✓</span><p class="eyebrow">APPLICATION RECEIVED</p><h2></h2><button class="back" type="button">Start a new application</button></div>';
    card.querySelector("h2").textContent = `Thanks, ${firstName}.`;
    card
      .querySelector("button")
      .addEventListener("click", () => window.location.reload());
  }
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
  form.addEventListener("input", () => {
    // Refresh host overrides while typing as well as on committed changes.
    reportPage();
  });
  form.addEventListener("change", () => {
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
      mode: "form-linked",
      widgetKey: config.widgetKey.trim(),
      fieldMap: config.fieldMap, // AmphiVox field id → local control id/name.
      target: "#your-form",
      language: "en-IN",
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
