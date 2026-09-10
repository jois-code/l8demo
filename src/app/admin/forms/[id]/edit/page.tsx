"use client";

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Use basic lucide icons or simple SVG for icons if lucide-react isn't installed.
// l8demo doesn't have lucide-react in package.json. I will use simple text/symbols or basic SVG.
const IconPlus = () => <span className="font-mono text-lg leading-none">+</span>;
const IconTrash = () => <span className="font-mono text-sm leading-none text-[var(--danger)]">x</span>;
const IconUp = () => <span>↑</span>;
const IconDown = () => <span>↓</span>;

const FormFieldEditor = ({ field, sectionId, updateField, removeField, moveField, sections, index, totalFields }: any) => {
  const handleOptionChange = (idx: number, key: string, value: any) => {
    const newOptions = [...(field.options || [])];
    newOptions[idx] = { ...newOptions[idx], [key]: value };
    updateField(sectionId, field.id, { options: newOptions });
  };

  const addOption = () => {
    const newOptions = [...(field.options || []), { id: `opt_${Date.now()}`, text: `Option ${(field.options?.length || 0) + 1}` }];
    updateField(sectionId, field.id, { options: newOptions });
  };

  return (
    <div className="bg-bg border border-border p-4 mb-4 flex gap-4 transition-colors">
      <div className="mt-2 flex flex-col gap-2 text-fg-dim">
        <button onClick={() => moveField(sectionId, field.id, 'up')} disabled={index === 0} className="hover:text-fg disabled:opacity-30 p-1"><IconUp /></button>
        <button onClick={() => moveField(sectionId, field.id, 'down')} disabled={index === totalFields - 1} className="hover:text-fg disabled:opacity-30 p-1"><IconDown /></button>
      </div>
      
      <div className="flex-grow space-y-4">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4">
          <input 
            type="text" 
            value={field.label}
            onChange={(e) => updateField(sectionId, field.id, { label: e.target.value })}
            className="text-lg font-bold bg-transparent border-b border-border focus:border-accent focus:outline-none w-full transition-colors pb-1"
            placeholder="Question text"
          />
          <select 
            value={field.type}
            onChange={(e) => updateField(sectionId, field.id, { type: e.target.value })}
            className="bg-bg-3 border border-border px-3 py-1.5 text-sm focus:outline-none focus:border-accent text-fg"
          >
            <option value="short_text">Short Text</option>
            <option value="paragraph">Paragraph</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="checkboxes">Checkboxes</option>
          </select>
        </div>

        {['multiple_choice', 'checkboxes'].includes(field.type) && (
          <div className="space-y-2 pl-2 border-l border-border mt-4">
            {(field.options || []).map((opt: any, idx: number) => (
              <div key={opt.id} className="flex flex-wrap items-center gap-3">
                <div className={`w-3 h-3 border border-fg-dim ${field.type === 'multiple_choice' ? 'rounded-full' : 'rounded-sm'}`} />
                <input 
                  type="text" 
                  value={opt.text}
                  onChange={(e) => handleOptionChange(idx, 'text', e.target.value)}
                  className="bg-transparent border-b border-border focus:border-accent focus:outline-none flex-grow text-sm py-1 min-w-[150px]"
                  placeholder={`Option ${idx + 1}`}
                />
                
                {field.type === 'multiple_choice' && sections.length > 1 && (
                  <select
                    value={opt.next_section_id || ''}
                    onChange={(e) => handleOptionChange(idx, 'next_section_id', e.target.value)}
                    className="text-xs bg-bg-3 border border-border px-2 py-1 text-fg-dim"
                  >
                    <option value="">Continue to next</option>
                    {sections.map((s: any) => (
                      <option key={s.id} value={s.id}>Go to: {s.title || 'Untitled'}</option>
                    ))}
                  </select>
                )}
                
                <button onClick={() => {
                  const newOptions = field.options.filter((_: any, i: number) => i !== idx);
                  updateField(sectionId, field.id, { options: newOptions });
                }} className="p-1 hover:bg-bg-3"><IconTrash /></button>
              </div>
            ))}
            <button onClick={addOption} className="text-sm text-accent hover:underline font-mono mt-2 flex items-center gap-2">
              <IconPlus /> add option
            </button>
          </div>
        )}

        <div className="flex justify-end items-center gap-4 pt-4 border-t border-border mt-4">
          <label className="flex items-center gap-2 text-sm text-fg-dim cursor-pointer">
            <input 
              type="checkbox" 
              checked={field.required}
              onChange={(e) => updateField(sectionId, field.id, { required: e.target.checked })}
              className="accent-[var(--accent)]"
            />
            Required
          </label>
          <button onClick={() => removeField(sectionId, field.id)} className="p-2 border border-transparent hover:border-[var(--danger)] text-[var(--danger)]"><IconTrash /></button>
        </div>
      </div>
    </div>
  );
};


export default function FormBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: formId } = use(params);
  const router = useRouter();
  
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/forms/${formId}`);
      if (res.ok) {
        const data = await res.json();
        setForm(data);
      } else {
        createBlankForm();
      }
      setLoading(false);
    }
    load();
  }, [formId]);

  function createBlankForm() {
    setForm({
      id: formId,
      title: 'Untitled Form',
      description: '',
      is_published: false,
      allow_edit_responses: false,
      closes_at: '',
      sections: [
        {
          id: `sec_${Date.now()}`,
          title: 'General Details',
          description: '',
          fields: []
        }
      ]
    });
  }

  const handleSaveToServer = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/forms/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error("Failed to save");
      alert("Saved successfully!");
    } catch (err: any) {
      alert("Failed to save form to server");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-8">loading...</div>;
  if (!form) return <div className="p-8">Error loading form.</div>;

  // Handlers
  const addField = (sectionId: string) => {
    const newField = {
      id: `field_${Date.now()}`,
      type: 'short_text',
      label: 'New Question',
      required: false,
      options: [],
    };
    const newSections = form.sections.map((s: any) => s.id === sectionId ? { ...s, fields: [...s.fields, newField] } : s);
    setForm({ ...form, sections: newSections });
  };

  const moveField = (sectionId: string, fieldId: string, direction: 'up' | 'down') => {
    const sectionIndex = form.sections.findIndex((s: any) => s.id === sectionId);
    const section = form.sections[sectionIndex];
    const fieldIndex = section.fields.findIndex((f: any) => f.id === fieldId);

    if (direction === 'up' && fieldIndex === 0) return;
    if (direction === 'down' && fieldIndex === section.fields.length - 1) return;

    const newFields = [...section.fields];
    const targetIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
    [newFields[fieldIndex], newFields[targetIndex]] = [newFields[targetIndex], newFields[fieldIndex]];

    const newSections = [...form.sections];
    newSections[sectionIndex] = { ...section, fields: newFields };
    setForm({ ...form, sections: newSections });
  };

  const updateField = (sectionId: string, fieldId: string, updates: any) => {
    const newSections = form.sections.map((s: any) => s.id === sectionId ? {
      ...s, fields: s.fields.map((f: any) => f.id === fieldId ? { ...f, ...updates } : f)
    } : s);
    setForm({ ...form, sections: newSections });
  };

  const removeField = (sectionId: string, fieldId: string) => {
    const newSections = form.sections.map((s: any) => s.id === sectionId ? { ...s, fields: s.fields.filter((f: any) => f.id !== fieldId) } : s);
    setForm({ ...form, sections: newSections });
  };

  const removeSection = (sectionId: string) => {
    if (form.sections.length <= 1) return alert("Must have at least one section.");
    if (!window.confirm("Delete section and all questions?")) return;
    setForm({ ...form, sections: form.sections.filter((s: any) => s.id !== sectionId) });
  };

  const addSection = () => {
    const newSection = {
      id: `sec_${Date.now()}`,
      title: `Section ${form.sections.length + 1}`,
      description: '',
      fields: []
    };
    setForm({ ...form, sections: [...form.sections, newSection] });
  };

  return (
    <div className="admin-page min-h-screen">
      <div className="admin-container">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <Link href="/admin" className="btn inline-flex font-mono text-sm px-2">&lt; back</Link>
            <input 
              type="text" 
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="text-2xl font-bold bg-transparent border-b border-border focus:border-accent outline-none w-full max-w-[300px]"
              placeholder="Form Title"
            />
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <label className="flex items-center gap-2 cursor-pointer font-mono text-sm text-fg-dim">
              <input 
                type="checkbox" 
                checked={form.is_published}
                onChange={(e) => setForm({ ...form, is_published: e.target.checked })}
                className="accent-[var(--accent)]"
              />
              PUBLISHED
            </label>
            <button 
              onClick={handleSaveToServer}
              disabled={isSaving}
              className="btn btn-solid"
            >
              {isSaving ? "Saving..." : "Save Form"}
            </button>
            <Link href={`/admin/forms/${form.id}/responses`} className="btn">Responses</Link>
          </div>
        </div>

        {/* Builder */}
        <div className="space-y-8 pb-32 max-w-4xl mx-auto">
          <div className="admin-card p-6 border-t-4 border-t-accent">
            <input 
              type="text" 
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="text-3xl font-display font-bold bg-transparent outline-none w-full mb-2"
              placeholder="Form Title"
            />
            <textarea 
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="text-fg-dim bg-transparent outline-none w-full resize-none mt-2 min-h-[60px]"
              placeholder="Form description..."
            />
            <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
               <label className="flex items-center gap-2 text-sm text-fg-dim">
                  <span className="font-mono uppercase text-xs">Closes At (YYYY-MM-DDTHH:mm)</span>
                  <input 
                    type="datetime-local" 
                    value={form.closes_at || ""}
                    onChange={(e) => setForm({...form, closes_at: e.target.value})}
                    className="bg-bg-3 border border-border px-2 py-1 outline-none focus:border-accent text-fg font-mono text-sm"
                  />
               </label>
               <label className="flex items-center gap-2 text-sm text-fg-dim">
                 <input type="checkbox" checked={form.allow_edit_responses} onChange={(e) => setForm({...form, allow_edit_responses: e.target.checked})} className="accent-[var(--accent)]" />
                 Allow respondents to edit
               </label>
            </div>
          </div>

          {form.sections.map((section: any, index: number) => {
            // Collect all checkbox/multiple_choice fields from previous sections for conditional visibility
            const conditionableFields = form.sections
              .slice(0, index)
              .flatMap((s: any) => s.fields)
              .filter((f: any) => ['checkboxes', 'multiple_choice'].includes(f.type) && f.options?.length > 0);

            const selectedCondField = conditionableFields.find((f: any) => f.id === section.show_if_field_id);

            return (
            <div key={section.id} className="admin-card p-6">
              <div className="flex items-start justify-between border-b border-border pb-4 mb-4">
                <div className="flex-1 mr-4">
                  <input 
                    type="text" 
                    value={section.title}
                    onChange={(e) => {
                      const newSections = [...form.sections];
                      newSections[index].title = e.target.value;
                      setForm({ ...form, sections: newSections });
                    }}
                    className="text-xl font-bold bg-transparent outline-none w-full"
                    placeholder={`Section ${index + 1}`}
                  />
                  <input 
                    type="text" 
                    value={section.description}
                    onChange={(e) => {
                      const newSections = [...form.sections];
                      newSections[index].description = e.target.value;
                      setForm({ ...form, sections: newSections });
                    }}
                    className="text-sm text-fg-dim bg-transparent outline-none w-full mt-2"
                    placeholder="Description (optional)"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-fg-faint font-mono">Sec {index + 1}/{form.sections.length}</span>
                  <button onClick={() => removeSection(section.id)} className="text-[var(--danger)] px-2 py-1 border border-border hover:border-[var(--danger)]"><IconTrash /></button>
                </div>
              </div>

              {/* Conditional visibility controls */}
              {index > 0 && conditionableFields.length > 0 && (
                <div className="mb-6 p-3 border border-dashed border-border bg-bg text-xs space-y-2">
                  <label className="flex items-center gap-2 text-fg-dim font-mono uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={!!section.show_if_field_id}
                      onChange={(e) => {
                        const newSections = [...form.sections];
                        if (e.target.checked) {
                          newSections[index].show_if_field_id = conditionableFields[0]?.id || '';
                          newSections[index].show_if_option_id = conditionableFields[0]?.options?.[0]?.id || '';
                        } else {
                          newSections[index].show_if_field_id = null;
                          newSections[index].show_if_option_id = null;
                        }
                        setForm({ ...form, sections: newSections });
                      }}
                      className="accent-[var(--accent)]"
                    />
                    show conditionally
                  </label>
                  {section.show_if_field_id && (
                    <div className="flex flex-wrap items-center gap-2 pl-5">
                      <span className="text-fg-faint">Show if</span>
                      <select
                        value={section.show_if_field_id || ''}
                        onChange={(e) => {
                          const newSections = [...form.sections];
                          newSections[index].show_if_field_id = e.target.value;
                          const newField = conditionableFields.find((f: any) => f.id === e.target.value);
                          newSections[index].show_if_option_id = newField?.options?.[0]?.id || '';
                          setForm({ ...form, sections: newSections });
                        }}
                        className="bg-bg-3 border border-border px-2 py-1 text-fg text-xs"
                      >
                        {conditionableFields.map((f: any) => (
                          <option key={f.id} value={f.id}>{f.label}</option>
                        ))}
                      </select>
                      <span className="text-fg-faint">includes</span>
                      <select
                        value={section.show_if_option_id || ''}
                        onChange={(e) => {
                          const newSections = [...form.sections];
                          newSections[index].show_if_option_id = e.target.value;
                          setForm({ ...form, sections: newSections });
                        }}
                        className="bg-bg-3 border border-border px-2 py-1 text-fg text-xs"
                      >
                        {(selectedCondField?.options || []).map((o: any) => (
                          <option key={o.id} value={o.id}>{o.text}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                {section.fields.map((field: any, fieldIndex: number) => (
                  <FormFieldEditor 
                    key={field.id} 
                    field={field} 
                    sectionId={section.id}
                    updateField={updateField}
                    removeField={removeField}
                    moveField={moveField}
                    sections={form.sections}
                    index={fieldIndex}
                    totalFields={section.fields.length}
                  />
                ))}
                
                <div className="flex justify-center pt-2">
                  <button onClick={() => addField(section.id)} className="btn text-sm font-mono flex items-center gap-2">
                    <IconPlus /> add question
                  </button>
                </div>
              </div>
            </div>
            );
          })}

          <div className="flex justify-center pt-4">
            <button onClick={addSection} className="btn border-dashed w-full max-w-sm font-mono">
              <IconPlus /> add section
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
