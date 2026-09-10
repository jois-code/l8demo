"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useAuth } from "../_components/auth-context";
import Link from "next/link";

/* ------------------------------------------------------------------ */
/*  Known auto-populated field IDs (from the seed config)              */
/* ------------------------------------------------------------------ */

const AUTO_FIELDS: Record<string, (user: any) => string> = {
  field_fullname: (u) => u.name || "",
  field_srn: (u) => u.srn || "",
  field_branch: (u) => u.branch || "",
  field_semester: (u) => u.semester || "",
};

const MAX_DOMAINS = 2;

export default function RecruitmentForm({ formId }: { formId: string }) {
  const { user, isLoading: authLoading } = useAuth();

  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Fetch form
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/forms/${formId}`);
        if (!res.ok) throw new Error("Failed to load form.");
        const data = await res.json();
        setForm(data);

        // Check for existing response
        try {
          const myResp = await fetch(`/api/forms/${formId}/my_response`);
          if (myResp.ok) {
            const myData = await myResp.json();
            if (myData.answers) {
              setSubmitted(true);
              if (data.allow_edit_responses) {
                const initial: Record<string, any> = {};
                myData.answers.forEach((ans: any) => {
                  initial[ans.field_id] = ans.value;
                });
                setAnswers(initial);
              }
            }
          }
        } catch {}
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [formId]);

  // Auto-populate fields once user is loaded
  useEffect(() => {
    if (!user || !form) return;
    setAnswers((prev) => {
      const updated = { ...prev };
      for (const [fieldId, getter] of Object.entries(AUTO_FIELDS)) {
        if (!updated[fieldId]) {
          updated[fieldId] = getter(user);
        }
      }
      return updated;
    });
  }, [user, form]);

  // Compute visible sections
  const visibleSections = useMemo(() => {
    if (!form) return [];
    return form.sections.filter((section: any) => {
      if (!section.show_if_field_id || !section.show_if_option_id) return true;
      const answer = answers[section.show_if_field_id];
      if (Array.isArray(answer)) {
        return answer.includes(section.show_if_option_id);
      }
      return answer === section.show_if_option_id;
    });
  }, [form, answers]);

  if (authLoading || loading) {
    return (
      <div className="text-center py-12 font-mono text-fg-dim">loading...</div>
    );
  }

  if (!user) {
    return (
      <div className="card max-w-md mx-auto text-center py-8 px-6">
        <p className="tag mb-4">authentication required</p>
        <p className="text-fg-dim text-sm mb-6">
          You need to login with your PESU credentials to fill this form. Your
          name, SRN, branch, and semester will be auto-populated.
        </p>
        <Link
          href="/login?redirect=/recruitments"
          className="btn btn-solid"
        >
          &gt; login_with_pesu
        </Link>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-8 text-[var(--danger)]">{error}</div>;
  }

  if (!form) return null;

  const isClosed =
    form.closes_at &&
    new Date() >
      new Date(
        form.closes_at.endsWith("Z") ? form.closes_at : form.closes_at + "Z"
      );

  if (isClosed) {
    return (
      <div className="card max-w-md mx-auto text-center py-8 px-6">
        <p className="text-4xl mb-4">🔒</p>
        <h2 className="text-2xl font-bold font-display mb-2">Form Closed</h2>
        <p className="text-fg-dim">
          This form is no longer accepting responses.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="term max-w-lg mx-auto">
        <div className="term-bar">
          <span className="term-dot" />
          <span className="term-dot" />
          <span className="term-dot" />
        </div>
        <div className="term-body">
          <span className="prompt">$</span> ./submit_application
          <br />
          <span className="muted">[ok]</span> application received. we&apos;ll
          reach out over email.
          <br />
          <span className="prompt">$</span>{" "}
          <span className="cursor">&nbsp;</span>
        </div>
      </div>
    );
  }

  const clampedIndex = Math.min(
    currentSectionIndex,
    visibleSections.length - 1
  );
  const currentSection = visibleSections[clampedIndex];

  if (!currentSection) return null;

  const handleAnswerChange = (fieldId: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxChange = (
    fieldId: string,
    optionId: string,
    isChecked: boolean
  ) => {
    setAnswers((prev) => {
      const current = prev[fieldId] || [];
      if (isChecked) {
        // Enforce max 2 domains for the domains field
        if (fieldId === "field_domains" && current.length >= MAX_DOMAINS) {
          return prev;
        }
        return { ...prev, [fieldId]: [...current, optionId] };
      } else {
        return {
          ...prev,
          [fieldId]: current.filter((id: string) => id !== optionId),
        };
      }
    });
  };

  const validateCurrentSection = () => {
    for (const field of currentSection.fields) {
      const val = answers[field.id];
      const strVal = typeof val === "string" ? val.trim() : val;

      if (field.required) {
        if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === "string" && strVal === "")) {
          setSubmitError(`"${field.label}" is a required field.`);
          return false;
        }
      }

      if (strVal && typeof strVal === "string") {
        const lowerLabel = field.label.toLowerCase();
        const lowerId = field.id.toLowerCase();
        
        if (lowerLabel.includes("email") || lowerId.includes("email")) {
          if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(strVal)) {
            setSubmitError(`Please enter a valid email address for "${field.label}".`);
            return false;
          }
        }
        
        if (lowerLabel.includes("phone") || lowerId.includes("phone") || lowerLabel.includes("whatsapp")) {
          const digits = strVal.replace(/\\D/g, "");
          if (digits.length < 10) {
            setSubmitError(`Please enter a valid phone number for "${field.label}".`);
            return false;
          }
        }
      }
    }
    setSubmitError("");
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentSection()) return;
    setCurrentSectionIndex(clampedIndex + 1);
  };

  const handlePrevious = () => {
    setCurrentSectionIndex(Math.max(0, clampedIndex - 1));
  };

  const handleSubmit = async () => {
    if (!validateCurrentSection()) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        answers: Object.entries(answers).map(([fieldId, value]) => ({
          field_id: fieldId,
          value,
        })),
      };
      const res = await fetch(`/api/forms/${formId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit form");
      }
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to submit form");
    } finally {
      setSubmitting(false);
    }
  };

  const isLastSection = clampedIndex >= visibleSections.length - 1;

  return (
    <div className="space-y-5">
      {/* Section header */}
      {(currentSection.title || currentSection.description) && (
        <div className="card" style={{ borderColor: "var(--accent)" }}>
          {currentSection.title && (
            <p className="tag">{currentSection.title}</p>
          )}
          {currentSection.description && (
            <p
              className="text-fg-dim text-sm"
              style={{ marginTop: "0.5rem" }}
            >
              {currentSection.description}
            </p>
          )}
        </div>
      )}

      {/* Fields */}
      {currentSection.fields.map((field: any) => {
        const isAutoField = field.id in AUTO_FIELDS;
        const isReadOnly = isAutoField && !!user;

        return (
          <div
            key={field.id}
            className={`field ${!answers[field.id] && field.required ? "" : ""}`}
          >
            <label htmlFor={field.id}>
              {field.label}
              {field.required && " *"}
              {isReadOnly && (
                <span
                  style={{
                    marginLeft: "0.5rem",
                    fontSize: "0.65rem",
                    color: "var(--accent)",
                    textTransform: "none",
                    letterSpacing: "0.02em",
                  }}
                >
                  (from PESU)
                </span>
              )}
            </label>

            {field.type === "short_text" && (
              <input
                id={field.id}
                type="text"
                maxLength={500}
                value={answers[field.id] || ""}
                onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                readOnly={isReadOnly}
                style={isReadOnly ? { opacity: 0.7, cursor: "not-allowed" } : {}}
              />
            )}

            {field.type === "paragraph" && (
              <textarea
                id={field.id}
                maxLength={1500}
                value={answers[field.id] || ""}
                onChange={(e) => handleAnswerChange(field.id, e.target.value)}
              />
            )}

            {field.type === "multiple_choice" && (
              <div className="checkbox-grid" style={
                field.options?.length === 10
                  ? { gridTemplateColumns: "repeat(10, minmax(2.4rem, 1fr))" }
                  : {}
              }>
                {field.options?.map((opt: any) => (
                  <label
                    key={opt.id}
                    className="chip-check"
                    style={
                      field.options?.length === 10
                        ? { justifyContent: "center" }
                        : {}
                    }
                  >
                    <input
                      type="radio"
                      name={field.id}
                      checked={answers[field.id] === opt.id}
                      onChange={() => handleAnswerChange(field.id, opt.id)}
                    />
                    {opt.text}
                  </label>
                ))}
              </div>
            )}

            {field.type === "checkboxes" && (
              <div className="checkbox-grid">
                {field.options?.map((opt: any) => {
                  const checked = (answers[field.id] || []).includes(opt.id);
                  const atMax =
                    field.id === "field_domains" &&
                    !checked &&
                    (answers[field.id] || []).length >= MAX_DOMAINS;
                  return (
                    <label
                      key={opt.id}
                      className={`chip-check ${atMax ? "chip-check-disabled" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={atMax}
                        onChange={(e) =>
                          handleCheckboxChange(field.id, opt.id, e.target.checked)
                        }
                      />
                      {opt.text}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Error */}
      {submitError && (
        <p style={{ color: "var(--danger)", fontSize: "0.85rem" }}>
          {submitError}
        </p>
      )}

      {/* Navigation */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          paddingTop: "0.5rem",
        }}
      >
        <div>
          {clampedIndex > 0 && (
            <button onClick={handlePrevious} className="btn">
              ← back
            </button>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span
            className="font-mono"
            style={{ fontSize: "0.7rem", color: "var(--fg-faint)" }}
          >
            {clampedIndex + 1} / {visibleSections.length}
          </span>
          {isLastSection ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="btn btn-solid"
            >
              {submitting ? "> submitting..." : "> submit_application"}
            </button>
          ) : (
            <button onClick={handleNext} className="btn btn-solid">
              next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
