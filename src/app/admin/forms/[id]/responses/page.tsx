"use client";

import React, { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatToIST } from '@/lib/date';

export default function FormResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: formId } = use(params);
  const router = useRouter();
  
  const [form, setForm] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingResponse, setViewingResponse] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [formRes, responsesRes] = await Promise.all([
          fetch(`/api/forms/${formId}`),
          fetch(`/api/forms/${formId}/responses`)
        ]);
        
        if (!formRes.ok || !responsesRes.ok) throw new Error("Failed to load");
        
        const formData = await formRes.json();
        const respData = await responsesRes.json();
        
        setForm(formData);
        setResponses(respData.responses || []);
      } catch (err: any) {
        setError(err.message || 'Failed to load responses');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [formId]);

  const downloadCSV = () => {
    if (!form || responses.length === 0) return;

    const allFields = form.sections.flatMap((s: any) => s.fields);
    
    // Helper to escape CSV values
    const escapeCSV = (val: any) => {
      let strVal = String(val || '');
      if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n')) {
        strVal = `"${strVal.replace(/"/g, '""')}"`;
      }
      return strVal;
    };

    // Create header row
    const headers = ["Submitted At", "Name", "SRN", "Email", ...allFields.map((f: any) => f.label)].map(escapeCSV);
    
    // Create data rows
    const rows = responses.map((response: any) => {
      const answerMap = new Map(response.answers.map((a: any) => [a.field_id, a.value]));
      
      const rowData = [
        formatToIST(response.submitted_at),
        response.respondent?.name || 'Anonymous',
        response.respondent?.srn || '-',
        response.respondent?.email || '-',
      ].map(escapeCSV);

      allFields.forEach((field: any) => {
        const val = answerMap.get(field.id);
        let displayVal = val;
        
        if (Array.isArray(val)) {
          displayVal = val.map(v => {
            const opt = field.options?.find((o:any) => o.id === v);
            return opt ? opt.text : v;
          }).join(', ');
        } else if (field.type === 'multiple_choice') {
          const opt = field.options?.find((o:any) => o.id === val);
          if (opt) displayVal = opt.text;
        }

        rowData.push(escapeCSV(displayVal));
      });

      return rowData.join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${form.title}_Responses.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deleteResponse = async (responseId: string) => {
    if (!confirm("Are you sure you want to delete this response?")) return;
    try {
      const res = await fetch(`/api/forms/${formId}/responses/${responseId}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete response");
      setResponses(responses.filter((r) => r.id !== responseId));
    } catch (err: any) {
      alert(err.message || "An error occurred");
    }
  };

  if (loading) return <div className="p-8 admin-page min-h-screen">loading...</div>;
  if (error || !form) return <div className="p-8 admin-page min-h-screen text-[var(--danger)]">{error}</div>;

  const allFields = form.sections.flatMap((s: any) => s.fields);

  return (
    <div className="admin-page min-h-screen">
      <div className="admin-container !max-w-full">
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="btn inline-flex font-mono text-sm px-2">&lt; back</button>
            <h1 className="text-xl font-bold truncate max-w-sm font-display">{form.title} - Responses</h1>
          </div>
          <div className="flex items-center gap-4 text-sm text-fg-dim">
            <div className="font-mono">{responses.length} responses</div>
            <button onClick={downloadCSV} className="btn btn-solid">Export CSV</button>
          </div>
        </div>

        {responses.length === 0 ? (
          <div className="admin-card p-12 text-center flex flex-col items-center max-w-2xl mx-auto mt-12">
            <h2 className="text-xl font-bold mb-2">Waiting for responses</h2>
            <p className="text-fg-dim">Once someone fills out your form, their answers will appear here.</p>
          </div>
        ) : (
          <div className="admin-card overflow-hidden">
            <div className="overflow-x-auto admin-table-wrap">
              <table className="admin-table w-full whitespace-nowrap">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Submitted At</th>
                    <th>Name</th>
                    <th>SRN</th>
                    <th>Email</th>
                    {allFields.map((field: any) => (
                      <th key={field.id} className="max-w-xs truncate" title={field.label}>
                        {field.label}
                      </th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((response: any, idx: number) => {
                    const answerMap = new Map(response.answers.map((a: any) => [a.field_id, a.value]));
                    return (
                      <tr key={response.id}>
                        <td className="text-fg-dim">{idx + 1}</td>
                        <td className="text-fg-dim text-[0.72rem]">
                          {formatToIST(response.submitted_at)}
                        </td>
                        <td className="font-bold">{response.respondent?.name || 'Anonymous'}</td>
                        <td className="text-fg-dim font-mono">{response.respondent?.srn || '-'}</td>
                        <td className="text-fg-dim">{response.respondent?.email || '-'}</td>
                        {allFields.map((field: any) => {
                          const val = answerMap.get(field.id);
                          let displayVal = val;
                          
                          if (Array.isArray(val)) {
                            displayVal = val.map(v => {
                              const opt = field.options?.find((o:any) => o.id === v);
                              return opt ? opt.text : v;
                            }).join(', ');
                          } else if (field.type === 'multiple_choice') {
                            const opt = field.options?.find((o:any) => o.id === val);
                            if (opt) displayVal = opt.text;
                          }

                          return (
                            <td key={field.id} className="max-w-xs truncate" title={String(displayVal || '')}>
                              {String(displayVal || '-')}
                            </td>
                          );
                        })}
                        <td>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setViewingResponse(response)} className="btn text-xs px-2 py-1">View</button>
                            <button onClick={() => deleteResponse(response.id)} className="btn text-[var(--danger)] border-[var(--danger)] hover:bg-[var(--danger)] hover:text-white text-xs px-2 py-1">Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* View Response Modal */}
        {viewingResponse && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-bg border border-border p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto admin-card relative">
              <div className="flex justify-between items-center mb-6 border-b border-border pb-4">
                <h2 className="text-xl font-bold font-display">Response Details</h2>
                <button onClick={() => setViewingResponse(null)} className="btn px-2 py-1 text-xs">Close</button>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm bg-bg-3 p-4 rounded-md">
                  <div>
                    <span className="text-fg-faint block text-xs uppercase tracking-wider mb-1">Name</span>
                    <span className="font-bold">{viewingResponse.respondent?.name || 'Anonymous'}</span>
                  </div>
                  <div>
                    <span className="text-fg-faint block text-xs uppercase tracking-wider mb-1">SRN</span>
                    <span className="font-mono">{viewingResponse.respondent?.srn || '-'}</span>
                  </div>
                  <div>
                    <span className="text-fg-faint block text-xs uppercase tracking-wider mb-1">Email</span>
                    <span>{viewingResponse.respondent?.email || '-'}</span>
                  </div>
                  <div>
                    <span className="text-fg-faint block text-xs uppercase tracking-wider mb-1">Submitted At</span>
                    <span className="text-fg-dim">
                      {formatToIST(viewingResponse.submitted_at)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {allFields.map((field: any) => {
                    const answerMap = new Map(viewingResponse.answers.map((a: any) => [a.field_id, a.value]));
                    const val = answerMap.get(field.id);
                    let displayVal = val;
                    
                    if (Array.isArray(val)) {
                      displayVal = val.map(v => {
                        const opt = field.options?.find((o:any) => o.id === v);
                        return opt ? opt.text : v;
                      }).join(', ');
                    } else if (field.type === 'multiple_choice') {
                      const opt = field.options?.find((o:any) => o.id === val);
                      if (opt) displayVal = opt.text;
                    }

                    return (
                      <div key={field.id} className="border-b border-border pb-4 last:border-0">
                        <label className="block text-sm text-fg-dim mb-1">{field.label}</label>
                        <p className="whitespace-pre-wrap font-medium">{String(displayVal || '-')}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
