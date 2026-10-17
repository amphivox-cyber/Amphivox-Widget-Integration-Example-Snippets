/* Mario's Café & Pâtisserie — feedback form (no framework, no deps) */
(function () {
  "use strict";

  let form = document.getElementById("feedback-form");
  let success = document.getElementById("feedback-success");
  let again = document.getElementById("feedback-again");
  let progressCount = document.getElementById("progress-count");
  let fields = form.querySelectorAll("textarea");

  // ── Counters + progress ───────────────────────────────────────────
  function updateCounter(el) {
    let counter = form.querySelector('.counter[data-for="' + el.id + '"]');
    if (counter) counter.textContent = el.value.length + " / " + el.maxLength;
  }

  function updateProgress() {
    let done = 0;
    fields.forEach(function (el) {
      let filled = el.value.trim().length > 0;
      if (filled) done++;
      el.closest(".field").classList.toggle("is-done", filled);
      let pip = document.querySelector('[data-pip="' + el.id + '"]');
      if (pip) pip.classList.toggle("is-done", filled);
    });
    progressCount.textContent = done;
  }

  // ── Validation ────────────────────────────────────────────────────
  function setError(el, message) {
    let field = el.closest(".field");
    field.classList.toggle("has-error", !!message);
    field.querySelector(".error-msg").textContent = message || "";
    el.setAttribute("aria-invalid", message ? "true" : "false");
  }

  function validate(el) {
    let ok = el.value.trim().length > 0;
    setError(el, ok ? "" : "Just a few words here, please.");
    return ok;
  }

  fields.forEach(function (el) {
    updateCounter(el);
    el.addEventListener("input", function () {
      updateCounter(el);
      updateProgress();
      if (el.closest(".field").classList.contains("has-error")) validate(el);
    });
  });

  // ── Starter chips: drop a phrase into the textarea to get going ──
  form.querySelectorAll(".chips").forEach(function (group) {
    let target = document.getElementById(group.getAttribute("data-target"));
    group.querySelectorAll(".chip").forEach(function (chip) {
      chip.addEventListener("click", function () {
        // Strip the leading emoji, keep the words.
        let phrase = chip.textContent.replace(/^[^\p{L}]+/u, "").trim();
        let current = target.value.replace(/\s+$/, "");
        target.value = current
          ? current + (/[.!?]$/.test(current) ? " " : ". ") + phrase + ": "
          : phrase + ": ";
        chip.classList.add("is-used");
        target.focus();
        target.setSelectionRange(target.value.length, target.value.length);
        // Bubbles so the voice widget's page report sees chip text too.
        target.dispatchEvent(new Event("input", { bubbles: true }));
      });
    });
  });

  // ── Submit (demo — no real backend) ───────────────────────────────
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    let firstInvalid = null;
    fields.forEach(function (el) {
      if (!validate(el)) {
        let field = el.closest(".field");
        field.classList.remove("shake");
        void field.offsetWidth; // restart the animation
        field.classList.add("shake");
        if (!firstInvalid) firstInvalid = el;
      }
    });
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    // Local confirmation only; connect your backend here before showing success.
    form.dispatchEvent(new Event("demo:submitted"));

    form.hidden = true;
    success.hidden = false;
    success.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  again.addEventListener("click", function () {
    window.location.reload();
  });
})();
