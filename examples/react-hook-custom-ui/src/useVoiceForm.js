import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { isSkip, SKIP } from "@amphivox/react";

// Keep manual controls, voice writes and validation on the same state.
export function useVoiceForm(schema, formRef, setStep, finish) {
  const [values, setValues] = useState({});
  const current = useRef({});
  const finished = useRef(false);
  const [skipped, setSkipped] = useState([]);
  const [notice, setNotice] = useState("");
  const pageCount = Math.max(...schema.fields.map((field) => field.page)) + 1;
  const fieldFor = (id) => schema.fields.find((field) => field.id === id);
  const update = (id, value) => {
    current.current = { ...current.current, [id]: value };
    setValues(current.current);
    setSkipped((ids) => ids.filter((item) => item !== id));
  };

  const toVoiceValue = (_field, value) =>
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
      ? null
      : value;

  // A refused voice answer's reason is spoken to the respondent, so each one
  // says exactly what is wrong, and never repeats the value itself.
  const errorFor = (field, value) => {
    const empty =
      value === undefined ||
      value === null ||
      (typeof value === "string" && !value.trim()) ||
      (Array.isArray(value) && value.length === 0);
    if (empty) return field.required ? "This question needs an answer." : null;
    if (field.multi) {
      return Array.isArray(value) &&
        value.every((item) => field.options.includes(item))
        ? null
        : `Please choose from: ${field.options.join(", ")}.`;
    }
    if (field.type === "bool")
      return typeof value === "boolean" ? null : "Please answer yes or no.";
    if (field.type === "int") {
      if (!Number.isInteger(value)) return "Please give a whole number.";
      if (field.min !== undefined && value < field.min)
        return `The smallest number allowed is ${field.min}.`;
      if (field.max !== undefined && value > field.max)
        return `The largest number allowed is ${field.max}.`;
      return null;
    }
    if (typeof value !== "string") return "That answer isn't accepted here.";
    if (field.options && !field.options.includes(value))
      return `Please choose from: ${field.options.join(", ")}.`;
    if (field.maxLength !== undefined && value.length > field.maxLength) {
      return `Please keep this answer to ${field.maxLength} characters or fewer.`;
    }
    return null;
  };
  // The browser's own message can quote the value back (a mistyped email).
  const nativeReason = (control) =>
    control.validity.typeMismatch && control.type === "email"
      ? "That doesn't look like a valid email address."
      : "That answer isn't accepted here.";

  const bind = (id, choice) => {
    const field = fieldFor(id);
    const constraints = {
      required: Boolean(field.required),
      ...(field.min !== undefined && { min: field.min }),
      ...(field.max !== undefined && { max: field.max }),
      ...(field.maxLength !== undefined && { maxLength: field.maxLength }),
    };
    if (field.multi)
      return {
        checked: (values[id] ?? []).includes(choice),
        onChange: (event) =>
          update(
            id,
            event.target.checked
              ? [...(current.current[id] ?? []), choice]
              : (current.current[id] ?? []).filter((item) => item !== choice),
          ),
      };
    if (choice !== undefined)
      return {
        ...constraints,
        checked: values[id] === choice,
        onChange: () => update(id, choice),
      };
    return {
      ...constraints,
      value: values[id] ?? "",
      onChange: (event) =>
        update(
          id,
          field.type === "int" && event.target.value !== ""
            ? Number(event.target.value)
            : event.target.value,
        ),
    };
  };
  const snapshot = (page) => ({
    page,
    values: Object.fromEntries(
      schema.fields
        .filter((field) => field.page === page)
        .map((field) => [
          field.id,
          toVoiceValue(field, current.current[field.id]),
        ]),
    ),
  });
  const validate = (page) => {
    const panel = formRef.current?.querySelector(`[data-step="${page}"]`);
    if (!panel) return false;
    const controls = [...panel.querySelectorAll("input,select,textarea")];
    const invalidField = schema.fields.find(
      (field) =>
        field.page === page && errorFor(field, current.current[field.id]),
    );
    const invalid = invalidField
      ? controls.find((control) => control.name === invalidField.id)
      : controls.find((control) => !control.checkValidity());
    if (!invalid && !invalidField) {
      setNotice("");
      return true;
    }
    setStep(page);
    setNotice("Please complete the highlighted field before continuing.");
    if (invalid)
      requestAnimationFrame(() => {
        invalid.focus();
        invalid.reportValidity();
      });
    return false;
  };
  const submit = () => {
    if (finished.current) return false;
    for (let page = 0; page < pageCount; page++)
      if (!validate(page)) return false;
    setNotice("");
    finished.current = true;
    finish();
    return true;
  };
  const onField = (id, incoming) => {
    // Submitted: there is no form to write into any more.
    if (finished.current) return { ok: false, cause: "write" };
    const field = fieldFor(id);
    if (!field)
      return {
        ok: false,
        cause: "write",
        reason: "This field is unavailable.",
      };
    if (isSkip(incoming)) {
      if (!field.required && toVoiceValue(field, current.current[id]) === null)
        setSkipped((ids) => (ids.includes(id) ? ids : [...ids, id]));
      return;
    }
    let value = incoming;
    const error = errorFor(field, value);
    if (error) return { ok: false, cause: "validation", reason: error };
    // Commit first so the actual control (including native email/date rules) is current.
    flushSync(() => update(id, value));
    const controls = [
      ...(formRef.current?.querySelectorAll("input,select,textarea") ?? []),
    ];
    const invalid = controls.find(
      (control) => control.name === id && !control.checkValidity(),
    );
    if (invalid) {
      return {
        ok: false,
        cause: "validation",
        reason: nativeReason(invalid),
      };
    }
    setNotice("");
  };
  const onSessionEnd = (ending) => {
    if (finished.current) return;
    switch (ending.reason) {
      case "complete":
        submit();
        break;
      case "hands_off":
        setNotice("Please finish the remaining fields by hand, then submit.");
        break;
      case "timeout":
        setNotice("Voice timed out. Continue typing or start voice again.");
        break;
      case "error":
        setNotice("Voice stopped working. Your answers are retained.");
        break;
      default:
        setNotice("Voice stopped. Your answers are retained.");
    }
  };
  const onError = ({ code, message }) => {
    if (finished.current) return;
    switch (code) {
      case "widget_not_ready":
        setNotice("Voice is loading. Please try again shortly.");
        break;
      case "session_busy":
      case "session_limit_exceeded":
        setNotice("Voice is busy. Please try again shortly.");
        break;
      default:
        setNotice(message || "Voice is unavailable. You can still type.");
    }
  };
  const reset = () => {
    finished.current = false;
    current.current = {};
    setValues({});
    setSkipped([]);
    setNotice("");
    setStep(0);
  };
  return {
    bind,
    snapshot,
    validate,
    submit,
    onField,
    onSessionEnd,
    onError,
    reset,
    notice,
    pageCount,
    initialValues: {
      ...Object.fromEntries(
        schema.fields
          .filter((field) => Object.hasOwn(current.current, field.id))
          .map((field) => [
            field.id,
            toVoiceValue(field, current.current[field.id]),
          ]),
      ),
      ...Object.fromEntries(skipped.map((id) => [id, SKIP])),
    },
  };
}
