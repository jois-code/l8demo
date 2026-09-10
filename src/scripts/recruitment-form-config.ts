/**
 * Recruitment form config — matching the questions from ~/Developer/test.
 *
 * Run with: npm run seed:recruitment
 */

import type { FormConfig } from "./seed-form";
import { seedForm } from "./seed-form";

/* ------------------------------------------------------------------ */
/*  Stable IDs (so re-seeding is idempotent)                           */
/* ------------------------------------------------------------------ */

const FORM_ID = "frm_recruitment_2026";

// Section IDs
const SEC_PERSONAL = "sec_personal";
const SEC_TECH = "sec_tech";
const SEC_MARKETING = "sec_marketing";
const SEC_DESIGN = "sec_design";
const SEC_MEDIA = "sec_media";
const SEC_EVENTS = "sec_events";
const SEC_FEEDBACK = "sec_feedback";

// The domains checkbox field (used for conditional visibility)
const FIELD_DOMAINS = "field_domains";

// Domain option IDs
const OPT_TECH = "opt_domain_tech";
const OPT_MARKETING = "opt_domain_marketing";
const OPT_DESIGN = "opt_domain_design";
const OPT_MEDIA = "opt_domain_media";
const OPT_EVENTS = "opt_domain_events";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function scaleOptions(fieldId: string, count: number = 10) {
  return Array.from({ length: count }, (_, i) => ({
    id: `${fieldId}_opt_${i + 1}`,
    text: String(i + 1),
  }));
}

/* ------------------------------------------------------------------ */
/*  Form config                                                        */
/* ------------------------------------------------------------------ */

const config: FormConfig = {
  id: FORM_ID,
  title: "Layer8 Recruitment 2026",
  description:
    "Tell us where you'd like to break things. No prior CTF experience required — curiosity and a willingness to get stuck matter more.",
  is_published: true,
  allow_edit_responses: false,
  closes_at: null,
  sections: [
    /* ============================================================ */
    /*  Section 1 — Personal Details                                 */
    /* ============================================================ */
    {
      id: SEC_PERSONAL,
      title: "Personal Details",
      description: "Fields marked with your PESU data are auto-filled and read-only.",
      fields: [
        {
          id: "field_fullname",
          type: "short_text",
          label: "Full Name",
          required: true,
        },
        {
          id: "field_srn",
          type: "short_text",
          label: "SRN",
          required: true,
        },
        {
          id: "field_branch",
          type: "short_text",
          label: "Branch",
          required: true,
        },
        {
          id: "field_semester",
          type: "short_text",
          label: "Year / Semester",
          required: true,
        },
        {
          id: "field_email",
          type: "short_text",
          label: "Email",
          required: true,
        },
        {
          id: "field_phone",
          type: "short_text",
          label: "Phone",
          required: true,
        },
        {
          id: FIELD_DOMAINS,
          type: "checkboxes",
          label: "Domains you're drawn to (pick up to 2)",
          required: true,
          options: [
            { id: OPT_TECH, text: "tech" },
            { id: OPT_MARKETING, text: "marketing" },
            { id: OPT_DESIGN, text: "design" },
            { id: OPT_MEDIA, text: "media" },
            { id: OPT_EVENTS, text: "events" },
          ],
        },
      ],
    },

    /* ============================================================ */
    /*  Section 2 — Tech Domain                                      */
    /* ============================================================ */
    {
      id: SEC_TECH,
      title: "Tech Domain Questions",
      description:
        "Check out your roles and responsibilities using the terminal on the recruitments page!",
      show_if_field_id: FIELD_DOMAINS,
      show_if_option_id: OPT_TECH,
      fields: [
        {
          id: "field_tech_cyber_exp",
          type: "multiple_choice",
          label: "Do you have any prior cybersecurity experience?",
          required: true,
          options: [
            { id: "opt_tech_cyber_yes", text: "Yes" },
            { id: "opt_tech_cyber_no", text: "No" },
          ],
        },
        {
          id: "field_tech_language",
          type: "short_text",
          label: "Name a programming language you can confidently code in",
          required: true,
        },
        {
          id: "field_tech_why",
          type: "paragraph",
          label: "Why do you want to join the Tech domain?",
          required: true,
        },
        {
          id: "field_tech_prior",
          type: "paragraph",
          label:
            "Tell us about your prior experience in tech (coding, CTFs, projects, etc.)",
          required: true,
        },
        {
          id: "field_tech_ctf",
          type: "multiple_choice",
          label: "Have you participated in any CTFs before?",
          required: true,
          options: [
            { id: "opt_tech_ctf_yes", text: "Yes" },
            { id: "opt_tech_ctf_no", text: "No" },
            { id: "opt_tech_ctf_other", text: "Other" },
          ],
        },
        {
          id: "field_tech_ctf_confidence",
          type: "multiple_choice",
          label:
            "On a scale of 1–10, how confident are you in making CTF challenges?",
          required: true,
          options: scaleOptions("field_tech_ctf_confidence"),
        },
        {
          id: "field_tech_github",
          type: "short_text",
          label: "GitHub profile (NA if none)",
          required: true,
        },
        {
          id: "field_tech_linkedin",
          type: "short_text",
          label: "LinkedIn profile (NA if none)",
          required: true,
        },
        {
          id: "field_tech_project",
          type: "paragraph",
          label:
            "Share a project, hackathon, or coding challenge you've worked on that you're proud of. (Include a link with proper permissions if you have one!)",
          required: true,
        },
      ],
    },

    /* ============================================================ */
    /*  Section 3 — Marketing Domain                                 */
    /* ============================================================ */
    {
      id: SEC_MARKETING,
      title: "Marketing Domain Questions",
      description:
        "Check out your roles and responsibilities using the terminal on the recruitments page!",
      show_if_field_id: FIELD_DOMAINS,
      show_if_option_id: OPT_MARKETING,
      fields: [
        {
          id: "field_mkt_why",
          type: "paragraph",
          label: "Why do you want to join the Marketing team of Layer8?",
          required: true,
        },
        {
          id: "field_mkt_exp",
          type: "paragraph",
          label:
            "Do you have prior experience in marketing? If yes, explain briefly (no experience is also fine).",
          required: true,
        },
        {
          id: "field_mkt_reach",
          type: "multiple_choice",
          label: "How good is your reach across the college?",
          required: true,
          options: scaleOptions("field_mkt_reach"),
        },
        {
          id: "field_mkt_creative",
          type: "paragraph",
          label:
            "What's the most creative or unconventional way you've promoted something in the past?",
          required: true,
        },
        {
          id: "field_mkt_whatsapp",
          type: "paragraph",
          label:
            "A few tech events have already happened in college, similarly draw up a WhatsApp blast for our Project Expo (include placeholder details).",
          required: true,
        },
        {
          id: "field_mkt_instagram",
          type: "short_text",
          label: "Give your Instagram handle",
          required: true,
        },
        {
          id: "field_mkt_ctf_scenario",
          type: "paragraph",
          label:
            "Imagine Layer8 is hosting a CTF, but registrations are very low. What steps would you take in the next 48 hours to increase participation?",
          required: true,
        },
      ],
    },

    /* ============================================================ */
    /*  Section 4 — Design Domain                                    */
    /* ============================================================ */
    {
      id: SEC_DESIGN,
      title: "Design Domain Questions",
      description:
        "Check out your roles and responsibilities using the terminal on the recruitments page!",
      show_if_field_id: FIELD_DOMAINS,
      show_if_option_id: OPT_DESIGN,
      fields: [
        {
          id: "field_design_why",
          type: "paragraph",
          label: "Why do you want to join the Design team?",
          required: true,
        },
        {
          id: "field_design_exp",
          type: "paragraph",
          label:
            "Do you have prior experience in design? (Graphic design, UI/UX, poster making, video editing, etc.)",
          required: true,
        },
        {
          id: "field_design_portfolio",
          type: "short_text",
          label:
            "Link to your design portfolio (if you upload a Google Drive link make sure you provide necessary permissions to view it)",
          required: true,
        },
      ],
    },

    /* ============================================================ */
    /*  Section 5 — Media Domain                                     */
    /* ============================================================ */
    {
      id: SEC_MEDIA,
      title: "Media Domain Questions",
      description:
        "Check out your roles and responsibilities using the terminal on the recruitments page!",
      show_if_field_id: FIELD_DOMAINS,
      show_if_option_id: OPT_MEDIA,
      fields: [
        {
          id: "field_media_why",
          type: "paragraph",
          label: "Why do you want to join the Media team?",
          required: true,
        },
        {
          id: "field_media_exp",
          type: "paragraph",
          label:
            "Do you have prior experience in photography, videography, or content creation? If yes, explain briefly.",
          required: true,
        },
        {
          id: "field_media_portfolio",
          type: "short_text",
          label:
            "If you are a video editor please upload your portfolio or link to some cool edits you have made. (Please use proper permissions so that we actually see your portfolio!)",
          required: false,
        },
        {
          id: "field_media_ideas",
          type: "paragraph",
          label: "Pitch a few Instagram post/reel ideas for our club.",
          required: true,
        },
        {
          id: "field_media_instagram",
          type: "short_text",
          label: "Give your Instagram handle",
          required: true,
        },
        {
          id: "field_media_trends",
          type: "multiple_choice",
          label:
            "On a scale of 1–10, how good are you at memes and current trends?",
          required: true,
          options: scaleOptions("field_media_trends"),
        },
        {
          id: "field_media_engagement",
          type: "paragraph",
          label:
            "Imagine you're covering one of our club's events, but engagement on social media is low. What's your plan to boost reach and engagement within 48 hours?",
          required: true,
        },
      ],
    },

    /* ============================================================ */
    /*  Section 6 — Events Domain                                    */
    /* ============================================================ */
    {
      id: SEC_EVENTS,
      title: "Events & Operations Domain Questions",
      description:
        "Check out your roles and responsibilities using the terminal on the recruitments page!",
      show_if_field_id: FIELD_DOMAINS,
      show_if_option_id: OPT_EVENTS,
      fields: [
        {
          id: "field_events_why",
          type: "paragraph",
          label: "Why do you want to join the Events & Ops team?",
          required: true,
        },
        {
          id: "field_events_prior",
          type: "paragraph",
          label:
            "Do you have prior experience organizing or managing events (college fests, workshops, meetups, etc.)? If yes, explain briefly.",
          required: true,
        },
        {
          id: "field_events_plan",
          type: "paragraph",
          label:
            "Walk us through the steps you'd follow to plan and execute an event from start to finish.",
          required: true,
        },
        {
          id: "field_events_orientation",
          type: "paragraph",
          label:
            "Suggest a few activities to conduct on orientation day to make juniors interested in the club.",
          required: true,
        },
        {
          id: "field_events_excites",
          type: "paragraph",
          label:
            "What excites you about event management, and why do you want to try it out in our club?",
          required: true,
        },
      ],
    },

    /* ============================================================ */
    /*  Section 7 — Feedback                                         */
    /* ============================================================ */
    {
      id: SEC_FEEDBACK,
      title: "Feedback",
      description: "",
      fields: [
        {
          id: "field_feedback",
          type: "paragraph",
          label:
            "If you have any feedback, inputs, or suggestions regarding the club or events or anything in general, please share them below",
          required: true,
        },
      ],
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Run seed                                                           */
/* ------------------------------------------------------------------ */

seedForm(config).catch((err) => {
  console.error("Failed to seed recruitment form:", err);
  process.exit(1);
});

export default config;
