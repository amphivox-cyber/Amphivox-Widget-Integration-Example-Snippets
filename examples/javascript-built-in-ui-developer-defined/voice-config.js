// The widget key comes from the gitignored voice-config.local.js.
// The phone number is marked PII and stays manual; notes can be filled by voice.
window.APPOINTMENT_VOICE_CONFIG = {
  debug: false, // Enable field-id/page diagnostics; answer values are never logged.
  widgetKey: window.AMPHIVOX_LOCAL_CONFIG?.widgetKey ?? "",
  schema: {
    description:
      "Book a Stillwell appointment. Do not request a phone number or health information by voice.",
    fields: [
      {
        id: "service",
        label: "Type of appointment",
        type: "enum",
        page: 0,
        required: true,
        options: [
          "Wellness consultation · 45 min",
          "Massage therapy · 60 min",
          "Nutrition session · 45 min",
          "First visit · 30 min",
        ],
      },
      {
        id: "date",
        label: "Preferred date",
        type: "date",
        page: 0,
        required: true,
      },
      {
        id: "time",
        label: "Time of day",
        type: "enum",
        page: 0,
        required: true,
        options: ["Morning · 9–12", "Afternoon · 12–4", "Evening · 4–7"],
      },
      {
        id: "firstVisit",
        label: "Is this your first visit?",
        type: "enum",
        page: 0,
        required: true,
        options: ["Yes, it is", "No, I’ve visited before"],
      },
      {
        id: "firstName",
        label: "First name",
        type: "str",
        page: 1,
        required: true,
      },
      {
        id: "lastName",
        label: "Last name",
        type: "str",
        page: 1,
        required: true,
      },
      {
        id: "email",
        label: "Email address",
        type: "email",
        page: 1,
        required: true,
      },
      { id: "phone", label: "Phone number", type: "phone", page: 1, pii: true },
      {
        id: "notes",
        label: "Additional notes",
        type: "long",
        page: 2,
      },
      {
        id: "access",
        label: "Visit preferences",
        type: "enum",
        page: 2,
        multi: true,
        options: [
          "Step-free access",
          "A quieter room",
          "Please explain what to expect",
        ],
      },
      {
        id: "reminders",
        label: "May we send appointment reminders?",
        type: "bool",
        page: 2,
      },
    ],
  },
};
