import { useRef, useState } from "react";
import VoiceAssistant from "./VoiceAssistant";
import { schema } from "./voice-schema";
import { useVoiceForm } from "./useVoiceForm";

const widgetKey = import.meta.env.VITE_AMPHIVOX_WIDGET_KEY?.trim();

const labels = ["YOUR DETAILS", "YOUR DAY", "FINAL DETAILS"];

export default function App() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [widgetGeneration, setWidgetGeneration] = useState(0);
  const formRef = useRef(null);
  const voice = useVoiceForm(schema, formRef, setStep, () => setDone(true));
  const advance = () => {
    if (done || step >= voice.pageCount - 1 || !voice.validate(step))
      return false;
    setStep((current) => current + 1);
  };
  const move = (direction) => {
    if (direction > 0) return advance();
    setStep((current) => Math.max(0, current - 1));
  };

  return (
    <main className="shell">
      <header className="brand">
        <span className="brand-mark">F.</span>
        <span>
          FIELDNOTES <small>GATHERING 2026</small>
        </span>
        <span className="edition">BENGALURU · OCT 17</span>
      </header>
      <p className="demo-notice">
        This sample form demonstrates how the AmphiVox Voice Agent integrates with web forms. Visit the <a href="https://amphivox.com/">official AmphiVox website</a>.
      </p>
      <section className="form-layout">
        <aside className="intro">
          <p className="eyebrow">A DAY FOR IDEAS IN THE WILD</p>
          <h1>
            Make room
            <br />
            for <em>curiosity.</em>
          </h1>
          <p className="lede">
            A one-day gathering for people who make things, ask questions, and
            bring others along.
          </p>
          <div className="event-facts">
            <p>
              <span>01</span> Saturday, October 17
            </p>
            <p>
              <span>02</span> The Courtyard, Bengaluru
            </p>
            <p>
              <span>03</span> Doors open at 9:30 AM
            </p>
          </div>
          <div className="seat-note">
            <b>✳</b>
            <span>
              <strong>Small by design</strong>
              <br />
              Just 180 seats around the table.
            </span>
          </div>
        </aside>
        <section
          className="form-card"
          aria-labelledby={done ? "form-title-complete" : `form-title-${step}`}
        >
          <div className="form-top">
            <span className="step-kicker">
              {done
                ? "REGISTRATION COMPLETE"
                : `${labels[step]} · 0${step + 1} / 0${voice.pageCount}`}
            </span>
            <span className="saved">
              <i /> Your place starts here
            </span>
          </div>
          <div className="progress">
            <span
              style={{
                width: done
                  ? "100%"
                  : `${((step + 1) / voice.pageCount) * 100}%`,
              }}
            />
          </div>
          {widgetKey && (
            <VoiceAssistant
              key={widgetGeneration}
              form={voice}
              step={step}
              advance={advance}
              completed={done}
            />
          )}
          {done ? (
            <div className="success">
              <div className="success-mark">✓</div>
              <h2 id="form-title-complete">See you around the table.</h2>
              <button
                className="back restart"
                onClick={() => {
                  setDone(false);
                  voice.reset();
                  setWidgetGeneration((generation) => generation + 1);
                }}
              >
                Register another person
              </button>
            </div>
          ) : (
            <form
              ref={formRef}
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                voice.submit();
              }}
            >
              <section
                className="step"
                data-step="0"
                aria-labelledby="form-title-0"
                hidden={step !== 0}
              >
                <h2 id="form-title-0">First, the basics.</h2>
                <p className="step-copy">
                  What should we put on your name tag?
                </p>
                <label className="field">
                  Full name
                  <input
                    name="name"
                    autoComplete="name"
                    placeholder="e.g. Jordan Lee"
                    {...voice.bind("name")}
                  />
                </label>
                <label className="field">
                  Email address
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    {...voice.bind("email")}
                  />
                </label>
                <label className="field">
                  Where do you call home?
                  <input
                    name="city"
                    placeholder="City, country"
                    {...voice.bind("city")}
                  />
                </label>
              </section>
              <section
                className="step"
                data-step="1"
                aria-labelledby="form-title-1"
                hidden={step !== 1}
              >
                <h2 id="form-title-1">Make it your day.</h2>
                <p className="step-copy">
                  A few details help us set the table.
                </p>
                <label className="field">
                  Your pass
                  <select name="pass" {...voice.bind("pass")}>
                    <option value="" disabled>
                      Choose a pass
                    </option>
                    <option>Gathering pass</option>
                    <option>Student pass</option>
                    <option>Community pass</option>
                  </select>
                </label>
                <label className="field">
                  How many seats?
                  <input name="seats" type="number" {...voice.bind("seats")} />
                </label>
                <fieldset className="choice-group">
                  <legend>What are you most excited for?</legend>
                  <label>
                    <input
                      type="checkbox"
                      name="interest"
                      value="Good conversations"
                      {...voice.bind("interest", "Good conversations")}
                    />{" "}
                    Good conversations
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      name="interest"
                      value="Hands-on workshops"
                      {...voice.bind("interest", "Hands-on workshops")}
                    />{" "}
                    Hands-on workshops
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      name="interest"
                      value="Meeting new people"
                      {...voice.bind("interest", "Meeting new people")}
                    />{" "}
                    Meeting new people
                  </label>
                </fieldset>
              </section>
              <section
                className="step"
                data-step="2"
                aria-labelledby="form-title-2"
                hidden={step !== 2}
              >
                <h2 id="form-title-2">One last thing.</h2>
                <p className="step-copy">Help us make everyone feel welcome.</p>
                <label className="field">
                  Anything we can prepare for you?
                  <textarea
                    name="notes"
                    rows="4"
                    placeholder="Dietary needs, access requests, or a note for the hosts"
                    {...voice.bind("notes")}
                  />
                </label>
              </section>
              <div className="form-actions">
                {step > 0 && (
                  <button
                    className="back"
                    type="button"
                    onClick={() => move(-1)}
                  >
                    ← Back
                  </button>
                )}
                {step < voice.pageCount - 1 ? (
                  <button
                    className="next"
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      move(1);
                    }}
                  >
                    Continue <span>→</span>
                  </button>
                ) : (
                  <button className="next" type="submit">
                    Reserve my seat <span>↗</span>
                  </button>
                )}
              </div>
            </form>
          )}
          {voice.notice && (
            <p className="voice-notice" role="status">
              {voice.notice}
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
