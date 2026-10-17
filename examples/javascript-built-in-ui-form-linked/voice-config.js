// Keep first name, last name, email address, and phone number marked as PII
// in the form-linked AmphiVox dashboard form.
window.JOB_APPLICATION_VOICE_CONFIG = {
  debug: false, // Enable field-id/page diagnostics; answer values are never logged.
  widgetKey: window.AMPHIVOX_LOCAL_CONFIG?.widgetKey ?? "",
  fieldMap: {
    first_name: "applicantFirstName", // Demonstrates a dashboard id mapped to a different local name.
    last_name: "last_name",
    email_address: "email_address",
    phone_number: "phone_number",
    position: "position",
    portfolio_or_linkedin_link: "portfolio_or_linkedin_link",
    work_location: "work_location",
    earliest_start_date: "earliest_start_date",
    tell_us_about_a_project_you_re_proud_of:
      "tell_us_about_a_project_you_re_proud_of",
    what_kind_of_work_gives_you_energy: "what_kind_of_work_gives_you_energy",
  },
};
