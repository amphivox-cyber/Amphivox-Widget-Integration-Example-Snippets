import { useState } from "react";
import { flushSync } from "react-dom";
import { VoiceWidget, isSkip } from "@amphivox/react";
import { schema } from "./voice-schema";

const widgetKey = import.meta.env.VITE_AMPHIVOX_WIDGET_KEY?.trim();

const sections = ["THE VISIT", "YOUR THOUGHTS", "A LITTLE MORE"];
const pageCount = sections.length;
const ratingIcons = ["☹", "◔", "◉", "☺", "♥"];
const optionsOf = (id) =>
  schema.fields.find((field) => field.id === id).options;

const endingNotices = {
  hands_off:
    "Voice couldn't finish every field. Please complete the rest, then send.",
  timeout: "Voice timed out. Your answers are still here.",
  error: "Voice stopped working. You can finish the form by hand.",
  manual: "Voice stopped. Your answers are still here.",
};

const isEmpty = (value) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0);

// Native date inputs use YYYY-MM-DD; voice dates are DD-MM-YYYY. Reversing the
// three parts converts in either direction.
const flipDate = (value) => value.split("-").reverse().join("-");

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// One set of rules for typed answers, voice answers and submission.
function problemWith(field, value) {
  if (isEmpty(value))
    return field.required ? `Please answer “${field.label}”.` : null;
  if (field.type === "email" && !/^\S+@\S+\.\S+$/.test(value)) {
    return "Please enter a valid email address.";
  }
  if (field.id === "visitDate" && value > today()) {
    return "The visit date can't be in the future.";
  }
  return null;
}

// What the widget needs to know about the page on screen: every field on it,
// null when unanswered, in the voice contract's shapes.
function pageSnapshot(values, page) {
  const fields = schema.fields.filter((field) => field.page === page);
  return {
    page,
    values: Object.fromEntries(
      fields.map((field) => {
        const value = values[field.id];
        if (isEmpty(value)) return [field.id, null];
        return [field.id, field.type === "date" ? flipDate(value) : value];
      }),
    ),
  };
}

export default function App() {
  const [values, setValues] = useState({});
  const [step, setStep] = useState(0);
  const [complete, setComplete] = useState(false);
  const [notice, setNotice] = useState("");
  const [widgetGeneration, setWidgetGeneration] = useState(0);

  const set = (id, value) =>
    setValues((previous) => ({ ...previous, [id]: value }));
  const toggle = (id, option) =>
    setValues((previous) => {
      const selected = previous[id] ?? [];
      return {
        ...previous,
        [id]: selected.includes(option)
          ? selected.filter((item) => item !== option)
          : [...selected, option],
      };
    });

  const firstProblemOn = (page) =>
    schema.fields
      .filter((field) => field.page === page)
      .map((field) => problemWith(field, values[field.id]))
      .find(Boolean);

  // Manual Continue and the agent's page turn both come through here.
  // Returning false tells the widget the page did not move.
  function advance() {
    if (complete || step >= pageCount - 1) return false;
    const problem = firstProblemOn(step);
    if (problem) {
      setNotice(problem);
      return false;
    }
    setNotice("");
    setStep(step + 1);
  }

  // Manual Send and a completed voice session both come through here.
  function submit() {
    if (complete) return;
    for (let page = 0; page < pageCount; page++) {
      const problem = firstProblemOn(page);
      if (problem) {
        setStep(page);
        setNotice(problem);
        return;
      }
    }
    // Demo only: send `values` to your backend here, and show success only
    // once it has been saved.
    setNotice("");
    setComplete(true);
  }

  function onField(fieldId, value) {
    if (complete) return { ok: false, cause: "write" };
    // The respondent skipped an optional field: leave it as it is.
    if (isSkip(value)) return;
    const field = schema.fields.find((item) => item.id === fieldId);
    if (field.type === "date") value = flipDate(value);
    const problem = problemWith(field, value);
    if (problem) return { ok: false, cause: "validation", reason: problem };
    // Commit now, so a page turn or completion that follows sees this answer.
    flushSync(() => set(fieldId, value));
  }

  function onSessionEnd({ reason }) {
    if (reason === "complete") submit();
    else setNotice(endingNotices[reason] ?? endingNotices.manual);
  }

  function onError({ code, message }) {
    if (code === "session_busy" || code === "session_limit_exceeded") {
      setNotice("Voice is busy right now. Please try again in a moment.");
    } else {
      setNotice(message);
    }
  }

  function startOver() {
    setValues({});
    setStep(0);
    setNotice("");
    setComplete(false);
    setWidgetGeneration((generation) => generation + 1); // a fresh widget
  }

  return (
    <main id="top" className="page">
      <header className="masthead">
        <a className="wordmark" href="#top">
          good<span>measure</span>
          <b>®</b>
        </a>
        <span className="mast-note">A NEIGHBORHOOD KITCHEN · EST. 2019</span>
      </header>
      <p className="demo-notice">
        This sample form demonstrates how the AmphiVox Voice Agent integrates with web forms. Visit the <a href="https://amphivox.com/">official AmphiVox website</a>.
      </p>
      <section className="feedback-wrap">
        <div className="left-rail">
          <div className="plate-art" aria-hidden="true">
            <span>g</span>
            <i />
            <b>
              GOOD FOOD
              <br />
              GOOD COMPANY
            </b>
          </div>
          <p className="eyebrow">A NOTE FROM YOUR LAST VISIT</p>
          <h1>
            Help us make
            <br />
            the <em>good stuff</em>
            <br />
            even better.
          </h1>
          <p className="lede">
            A few honest words go a long way. Thanks for sharing a little of
            your time with us.
          </p>
          <div className="rail-bottom">
            <span className="open-dot" /> ALWAYS ROOM AT THE TABLE
          </div>
        </div>
        <section className="feedback-card">
          <div className="card-heading">
            <span className="counter">
              {complete ? "THANK YOU" : `0${step + 1} / 0${pageCount}`}
            </span>
            <span className="section-label">
              {complete ? "NOTE RECEIVED" : sections[step]}
            </span>
          </div>
          <div className="progress">
            <span
              style={{
                width: complete ? "100%" : `${((step + 1) / pageCount) * 100}%`,
              }}
            />
          </div>
          {complete ? (
            <div className="thanks">
              <div className="thank-icon">✳</div>
              <h2>
                We’ll keep making
                <br />
                <em>room for you.</em>
              </h2>
              <button className="button secondary" onClick={startOver}>
                Leave another note
              </button>
            </div>
          ) : (
            <form
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                submit();
              }}
            >
              <section aria-labelledby="section-title-0" hidden={step !== 0}>
                <h2 id="section-title-0">Tell us about the visit.</h2>
                <p className="hint">
                  The little details help us find the right moment.
                </p>
                <label className="field">
                  When did you visit?
                  <input
                    type="date"
                    max={today()}
                    value={values.visitDate ?? ""}
                    onChange={(event) => set("visitDate", event.target.value)}
                  />
                </label>
                <label className="field">
                  What brought you in?
                  <select
                    value={values.occasion ?? ""}
                    onChange={(event) => set("occasion", event.target.value)}
                  >
                    <option value="" disabled>
                      Select an occasion
                    </option>
                    {optionsOf("occasion").map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <fieldset className="rating">
                  <legend>How did it feel?</legend>
                  <div>
                    {optionsOf("rating").map((label, index) => (
                      <label key={label}>
                        <input
                          type="radio"
                          name="rating"
                          checked={values.rating === label}
                          onChange={() => set("rating", label)}
                        />
                        <span>{ratingIcons[index]}</span>
                        <small>{label}</small>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </section>
              <section aria-labelledby="section-title-1" hidden={step !== 1}>
                <h2 id="section-title-1">What stayed with you?</h2>
                <p className="hint">
                  Tell us what worked, or what we could do better.
                </p>
                <label className="field">
                  Your note
                  <textarea
                    rows="5"
                    maxLength={1000}
                    placeholder="The service was warm, the bread was..."
                    value={values.feedback ?? ""}
                    onChange={(event) => set("feedback", event.target.value)}
                  />
                </label>
                <label className="field">
                  Anything you’d love to see on the menu?
                  <input
                    maxLength={150}
                    placeholder="A dish, a flavor, an old favorite"
                    value={values.menuIdea ?? ""}
                    onChange={(event) => set("menuIdea", event.target.value)}
                  />
                </label>
                <fieldset className="check-grid">
                  <legend>What would you come back for?</legend>
                  {optionsOf("returnFor").map((option) => (
                    <label key={option}>
                      <input
                        type="checkbox"
                        checked={(values.returnFor ?? []).includes(option)}
                        onChange={() => toggle("returnFor", option)}
                      />{" "}
                      {option}
                    </label>
                  ))}
                </fieldset>
              </section>
              <section aria-labelledby="section-title-2" hidden={step !== 2}>
                <h2 id="section-title-2">Keep in touch?</h2>
                <p className="hint">
                  Totally optional. We’d only write when there’s something good
                  to share.
                </p>
                <label className="field">
                  Email address
                  <input
                    type="email"
                    placeholder="you@example.com"
                    value={values.email ?? ""}
                    onChange={(event) => set("email", event.target.value)}
                  />
                </label>
                <label className="field">
                  Anything else on your mind?
                  <textarea
                    rows="3"
                    maxLength={1000}
                    placeholder="A shout-out, a small fix, anything at all"
                    value={values.extra ?? ""}
                    onChange={(event) => set("extra", event.target.value)}
                  />
                </label>
                <fieldset className="check-grid yes-no">
                  <legend>May our team follow up about your feedback?</legend>
                  <label>
                    <input
                      type="radio"
                      name="followUp"
                      checked={values.followUp === true}
                      onChange={() => set("followUp", true)}
                    />{" "}
                    Yes
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="followUp"
                      checked={values.followUp === false}
                      onChange={() => set("followUp", false)}
                    />{" "}
                    No
                  </label>
                </fieldset>
              </section>
              <div className="actions">
                {step > 0 && (
                  <button
                    className="button secondary"
                    type="button"
                    onClick={() => setStep(step - 1)}
                  >
                    ← Previous
                  </button>
                )}
                {step < pageCount - 1 ? (
                  <button
                    className="button primary"
                    type="button"
                    onClick={(event) => {
                      // React reuses this node as Send on the final page.
                      event.preventDefault();
                      advance();
                    }}
                  >
                    Continue <span>→</span>
                  </button>
                ) : (
                  <button className="button primary" type="submit">
                    Send my note <span>↗</span>
                  </button>
                )}
              </div>
            </form>
          )}
          {widgetKey && (
            <>
              <p className="voice-disclosure" hidden={complete}>
                Use the floating microphone to answer with an AI voice
                assistant, or fill in the form yourself.
              </p>
              {/* Stays mounted after submission so its post-session rating can show. */}
              <VoiceWidget
                key={widgetGeneration}
                mode="developer-defined"
                widgetKey={widgetKey}
                schema={schema}
                page={pageSnapshot(values, step)}
                onField={onField}
                onAdvancePage={advance}
                onSessionEnd={onSessionEnd}
                onError={onError}
              />
            </>
          )}
          {notice && (
            <p className="voice-notice" role="status">
              {notice}
            </p>
          )}
        </section>
      </section>
      <footer className="foot">
        <span>GOOD MEASURE · BENGALURU</span>
        <span>MADE BETTER, TOGETHER.</span>
      </footer>
    </main>
  );
}
