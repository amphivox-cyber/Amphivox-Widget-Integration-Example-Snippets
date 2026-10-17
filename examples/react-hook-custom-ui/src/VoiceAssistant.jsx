import { useEffect, useState } from "react";
import { useVoiceWidget } from "@amphivox/react";
import { schema } from "./voice-schema";

function VoiceIcon({ muted = false }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
      {muted && <path d="m3 3 18 18" />}
    </svg>
  );
}

export default function VoiceAssistant({ form, step, advance, completed }) {
  const [live, setLive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [muted, setMuted] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [lines, setLines] = useState([]);
  const widget = useVoiceWidget({
    mode: "developer-defined",
    widgetKey: import.meta.env.VITE_AMPHIVOX_WIDGET_KEY.trim(),
    schema,
    hidden: true,
    initialValues: form.initialValues,
    onField: form.onField,
    onAdvancePage: advance,
    onSessionStart: () => {
      setStarting(false);
      setLive(true);
      setMuted(false);
      setLines([]);
    },
    onSessionEnd: (ending) => {
      setStarting(false);
      setLive(false);
      setSpeaking(false);
      setThinking(false);
      form.onSessionEnd(ending);
    },
    onError: (error) => {
      setStarting(false);
      form.onError(error);
    },
    onMuteChange: setMuted,
    onThinking: setThinking,
    onSpeaking: (who, active) => {
      if (who === "bot") setSpeaking(active);
    },
    onTranscript: (speaker, text, index) =>
      setLines((previous) => {
        const next = [...previous];
        next[index] = { speaker, text };
        return next;
      }),
  });
  const snapshot = JSON.stringify(form.snapshot(step));
  useEffect(() => {
    widget.reportPage(JSON.parse(snapshot));
  }, [widget, snapshot]);
  useEffect(() => {
    if (completed && live) widget.close();
  }, [completed, live, widget]);
  const open = () => {
    if (completed || starting) return;
    setStarting(true);
    widget.reportPage(form.snapshot(step));
    widget.open();
  };
  // Keep the hook (and iframe) mounted after submission; only hide our form controls.
  if (completed) return null;
  const state = starting
    ? "connecting"
    : !live
      ? "idle"
      : muted
        ? "muted"
        : speaking
          ? "speaking"
          : thinking
            ? "thinking"
            : "listening";
  const status = {
    idle: "Ready when you are",
    connecting: "Connecting…",
    muted: "Microphone muted",
    speaking: "Assistant speaking",
    thinking: "Thinking…",
    listening: "Listening to you",
  }[state];
  const transcriptCount = lines.filter(Boolean).length;
  return (
    <aside
      className="voice-assistant"
      aria-labelledby="voice-title"
      data-state={state}
    >
      <div className="voice-heading">
        <span className="voice-emblem">
          <VoiceIcon />
        </span>
        <div>
          <p className="voice-eyebrow">A MORE NATURAL WAY</p>
          <h3 id="voice-title">A little less typing.</h3>
        </div>
        <span className="voice-state" role="status">
          <i aria-hidden="true" />
          {status}
        </span>
      </div>
      <p className="voice-description">
        Tell us the details. We&rsquo;ll put them in place.
        <br />
        You can edit your answers at any time.
      </p>
      <div className="voice-controls">
        <button
          className="voice-primary"
          type="button"
          onClick={live ? widget.close : open}
          disabled={starting}
          aria-busy={starting}
        >
          {live ? (
            <span className="voice-stop-icon" aria-hidden="true" />
          ) : (
            <VoiceIcon />
          )}
          {starting ? "Connecting…" : live ? "Stop voice" : "Answer by voice"}
        </button>
        <button
          className="voice-secondary"
          type="button"
          onClick={muted ? widget.unmute : widget.mute}
          disabled={!live}
          aria-pressed={live && muted}
          aria-label={live && muted ? "Unmute microphone" : "Mute microphone"}
        >
          <VoiceIcon muted={live && muted} />
          {live && muted ? "Unmute" : "Mute"}
        </button>
        <span className="voice-levels" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>
      {/* The custom UI must retain the hidden dock's AI disclosure. */}
      <p className="voice-disclosure">
        You&rsquo;re speaking with an AI assistant, not a person.
      </p>
      {muted && live && (
        <p className="voice-muted-note">
          The session is still running and can time out while muted.
        </p>
      )}
      <details className="voice-transcript">
        <summary>
          <span>Conversation transcript</span>
          <span className="voice-transcript-count">
            {transcriptCount
              ? `${transcriptCount} ${transcriptCount === 1 ? "entry" : "entries"}`
              : "Live notes"}
          </span>
        </summary>
        {transcriptCount === 0 ? (
          <p className="voice-empty">
            Your conversation will appear here once you start.
          </p>
        ) : (
          <ol>
            {lines.map(
              (line, index) =>
                line && (
                  <li key={index}>
                    <strong>
                      {line.speaker === "bot" ? "Assistant" : "You"}:
                    </strong>
                    <span>{line.text}</span>
                  </li>
                ),
            )}
          </ol>
        )}
      </details>
    </aside>
  );
}
