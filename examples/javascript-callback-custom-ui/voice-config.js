// Create a developer-defined key in AmphiVox's Widgets area.
window.CAFE_VOICE_CONFIG = {
  widgetKey: window.AMPHIVOX_LOCAL_CONFIG?.widgetKey ?? "",
  schema: {
    description: "Three open-ended questions about a visit to Mario's Café.",
    fields: [
      {
        id: "order",
        label: "What did you order, and what did you think?",
        type: "long",
        required: true,
        maxLength: 1500,
        page: 0,
      },
      {
        id: "vibe",
        label: "How did you like the atmosphere?",
        type: "long",
        required: true,
        maxLength: 1500,
        page: 0,
      },
      {
        id: "standouts",
        label: "What stood out, and would you recommend us?",
        type: "long",
        required: true,
        maxLength: 1500,
        page: 0,
      },
    ],
  },
};
