"use client";

import React, { useEffect, useState, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Use basic icons
const IconCheck = () => <span className="font-mono text-emerald-500">✔</span>;
const IconArrowRight = () => <span>→</span>;
const IconArrowLeft = () => <span>←</span>;
const IconLock = () => <span>🔒</span>;

export default function FormViewerPage({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = use(params);
  const router = useRouter();
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await fetch(`/api/forms/${formId}`);
        if (!response.ok) throw new Error('Failed to load form. It may not exist.');
        const data = await response.json();
        
        // Data is already sorted by order_index by the backend query
        setForm(data);

        // Fetch my existing response if any
        try {
          const myResp = await fetch(`/api/forms/${formId}/my_response`);
          if (myResp.ok) {
            const myData = await myResp.json();
            if (myData.answers) {
              setSubmitted(true);
              if (data.allow_edit_responses) {
                const initialAnswers: Record<string, any> = {};
                myData.answers.forEach((ans: any) => {
                  initialAnswers[ans.field_id] = ans.value;
                });
                setAnswers(initialAnswers);
              }
            }
          }
        } catch (err) {}
      } catch (err: any) {
        setError(err.message || 'Failed to load form.');
      } finally {
        setLoading(false);
      }
    };
    fetchForm();
  }, [formId]);

  // Compute visible sections based on current answers
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

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center text-fg-dim font-mono">
        loading...
      </div>
    );
  }
  
  if (error || !form) return <div className="p-8 text-center text-[var(--danger)]">{error}</div>;

  const isClosed = form.closes_at && new Date() > new Date(form.closes_at.endsWith('Z') ? form.closes_at : form.closes_at + 'Z');

  if (isClosed) return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="bg-bg-3 border border-border p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4"><IconLock /></div>
        <h2 className="text-2xl font-bold font-display text-fg mb-2">Form Closed</h2>
        <p className="text-fg-dim mb-6">This form is no longer accepting responses.</p>
        <button onClick={() => router.back()} className="btn btn-solid">
          Go Back
        </button>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="bg-bg-3 border border-border p-8 max-w-md w-full text-center">
        <div className="text-4xl mb-4"><IconCheck /></div>
        <h2 className="text-2xl font-bold mb-2">Response recorded</h2>
        <p className="text-fg-dim mb-8">Your response has been successfully submitted to {form.title}.</p>
        <div className="flex flex-col gap-4 items-center">
          <Link href="/events" className="text-accent hover:underline font-mono">
            Return to Events
          </Link>
          {form.allow_edit_responses && (
            <button onClick={() => { setSubmitted(false); setCurrentSectionIndex(0); }} className="text-sm text-fg-dim hover:text-fg underline">
              Edit your response
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // Clamp current index to visible sections range
  const clampedIndex = Math.min(currentSectionIndex, visibleSections.length - 1);
  const currentSection = visibleSections[clampedIndex];

  if (!currentSection) return <div className="p-8 text-center text-[var(--danger)]">No visible sections.</div>;

  const handleAnswerChange = (fieldId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleCheckboxChange = (fieldId: string, optionId: string, isChecked: boolean) => {
    setAnswers(prev => {
      const current = prev[fieldId] || [];
      if (isChecked) {
        return { ...prev, [fieldId]: [...current, optionId] };
      } else {
        return { ...prev, [fieldId]: current.filter((id: string) => id !== optionId) };
      }
    });
  };

  const validateCurrentSection = () => {
    for (const field of currentSection.fields) {
      const val = answers[field.id];
      const strVal = typeof val === "string" ? val.trim() : val;

      if (field.required) {
        if (!val || (Array.isArray(val) && val.length === 0) || (typeof val === "string" && strVal === "")) {
          alert(`"${field.label}" is a required field.`);
          return false;
        }
      }

      if (strVal && typeof strVal === "string") {
        const lowerLabel = field.label.toLowerCase();
        const lowerId = field.id.toLowerCase();
        
        if (lowerLabel.includes("email") || lowerId.includes("email")) {
          if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(strVal)) {
            alert(`Please enter a valid email address for "${field.label}".`);
            return false;
          }
        }
        
        if (lowerLabel.includes("phone") || lowerId.includes("phone") || lowerLabel.includes("whatsapp")) {
          const digits = strVal.replace(/\\D/g, "");
          if (digits.length < 10) {
            alert(`Please enter a valid phone number for "${field.label}".`);
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentSection()) return;
    // Check if any multiple_choice field has a next_section_id override
    let overrideNextSectionId = null;
    for (const field of currentSection.fields) {
      if (field.type === 'multiple_choice') {
        const answeredOptionId = answers[field.id];
        if (answeredOptionId) {
          const option = field.options?.find((o: any) => o.id === answeredOptionId);
          if (option && option.next_section_id) {
            overrideNextSectionId = option.next_section_id;
            break;
          }
        }
      }
    }

    if (overrideNextSectionId) {
      const idx = visibleSections.findIndex((s: any) => s.id === overrideNextSectionId);
      if (idx !== -1) {
        setCurrentSectionIndex(idx);
        return;
      }
    }

    setCurrentSectionIndex(clampedIndex + 1);
  };

  const handlePrevious = () => {
    setCurrentSectionIndex(Math.max(0, clampedIndex - 1));
  };

  const handleSubmit = async () => {
    if (!validateCurrentSection()) return;
    setSubmitting(true);
    try {
      const payload = {
        answers: Object.entries(answers).map(([fieldId, value]) => ({
          field_id: fieldId,
          value: value
        }))
      };
      const res = await fetch(`/api/forms/${formId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to submit form");
      }
      setSubmitted(true);
    } catch (err: any) {
      alert(err.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const isLastSection = clampedIndex >= visibleSections.length - 1;

  return (
    <div className="min-h-screen bg-bg text-fg py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {clampedIndex === 0 && (
          <div className="bg-bg-3 border-t-8 border-t-accent border border-border p-8 shadow-md">
            <h1 className="text-4xl font-bold font-display mb-4">{form.title}</h1>
            {form.description && (
              <p className="text-fg-dim whitespace-pre-wrap">{form.description}</p>
            )}
          </div>
        )}

        {(currentSection.title || currentSection.description) && (
          <div className="bg-bg-3 border border-border p-6 shadow-sm">
            {currentSection.title && <h2 className="text-2xl font-bold mb-2">{currentSection.title}</h2>}
            {currentSection.description && <p className="text-fg-dim">{currentSection.description}</p>}
          </div>
        )}

        {currentSection.fields.map((field: any) => (
          <div key={field.id} className="bg-bg border border-border p-6 shadow-sm focus-within:border-accent transition-colors">
            <label className="block text-lg font-medium mb-4">
              {field.label} {field.required && <span className="text-[var(--danger)]">*</span>}
            </label>
            
            {field.type === 'short_text' && (
              <input 
                type="text"
                value={answers[field.id] || ''}
                onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                placeholder="Your answer"
                className="w-full md:w-1/2 bg-transparent border-b border-border focus:border-accent focus:outline-none py-2 transition-colors"
              />
            )}
            
            {field.type === 'paragraph' && (
              <textarea 
                value={answers[field.id] || ''}
                onChange={(e) => handleAnswerChange(field.id, e.target.value)}
                placeholder="Your answer"
                rows={3}
                className="w-full bg-transparent border-b border-border focus:border-accent focus:outline-none py-2 transition-colors resize-none"
              />
            )}

            {field.type === 'multiple_choice' && (
              <div className="space-y-3">
                {field.options?.map((opt: any) => (
                  <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="radio" 
                      name={field.id}
                      value={opt.id}
                      checked={answers[field.id] === opt.id}
                      onChange={() => handleAnswerChange(field.id, opt.id)}
                      className="w-4 h-4 text-accent bg-bg border-border focus:ring-accent accent-[var(--accent)]"
                    />
                    <span className="text-fg group-hover:text-accent transition-colors">{opt.text}</span>
                  </label>
                ))}
              </div>
            )}

            {field.type === 'checkboxes' && (
              <div className="space-y-3">
                {field.options?.map((opt: any) => (
                  <label key={opt.id} className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={(answers[field.id] || []).includes(opt.id)}
                      onChange={(e) => handleCheckboxChange(field.id, opt.id, e.target.checked)}
                      className="w-4 h-4 text-accent bg-bg border-border focus:ring-accent accent-[var(--accent)]"
                    />
                    <span className="text-fg group-hover:text-accent transition-colors">{opt.text}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        <div className="flex items-center justify-between pt-4">
          <div>
            {clampedIndex > 0 && (
              <button 
                onClick={handlePrevious}
                className="btn border border-border"
              >
                <IconArrowLeft /> Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-fg-faint font-mono">
              {clampedIndex + 1} / {visibleSections.length}
            </span>
            {isLastSection ? (
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="btn btn-solid"
              >
                {submitting ? "Submitting..." : "Submit"} <IconCheck />
              </button>
            ) : (
              <button 
                onClick={handleNext}
                className="btn btn-solid"
              >
                Next <IconArrowRight />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
