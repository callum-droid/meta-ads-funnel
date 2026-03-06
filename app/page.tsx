"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── TYPES ────────────────────────────────────────────────────────
interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  concerns: string[];
  treatment: string;
  timeline: string;
  previousTreatment: string;
  completedSteps: number;
  submittedAt: string | null;
}

// ─── DATA ─────────────────────────────────────────────────────────
const CONCERN_OPTIONS = [
  { value: "crooked", icon: "😬", label: "Crooked Teeth" },
  { value: "gaps", icon: "🦷", label: "Gaps Between Teeth" },
  { value: "underbite", icon: "↕️", label: "Underbite" },
  { value: "overbite", icon: "⬆️", label: "Overbite" },
  { value: "crowding", icon: "🔀", label: "Crowding" },
  { value: "whitening", icon: "✨", label: "Teeth Whitening" },
  { value: "general", icon: "💎", label: "Veneers / Cosmetic" },
  { value: "unsure", icon: "🤔", label: "Not Sure Yet" },
];

const TREATMENT_OPTIONS = [
  { value: "aligners", label: "Clear Aligners (e.g. Invisalign)" },
  { value: "braces", label: "Traditional Braces" },
  { value: "cosmetic", label: "Cosmetic Dentistry (veneers, bonding)" },
  { value: "whitening", label: "Professional Whitening" },
  { value: "unsure", label: "I'd like professional advice" },
];

const TIMELINE_OPTIONS = [
  { value: "asap", label: "As soon as possible" },
  { value: "1-3months", label: "Within the next 1–3 months" },
  { value: "3-6months", label: "3–6 months from now" },
  { value: "exploring", label: "Just exploring options for now" },
];


const STEP_LABELS = ["Your Details", "Your Smile", "Goals", "Timeline"];

// ─── COMPONENT ────────────────────────────────────────────────────
export default function SmileJourneyFunnel() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    concerns: [],
    treatment: "",
    timeline: "",
    previousTreatment: "",
    completedSteps: 0,
    submittedAt: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const lastSavedStep = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  // ─── EXIT INTENT POPUP ────────────────────────────────────────
  const [showExitPopup, setShowExitPopup] = useState(false);
  const [exitPhone, setExitPhone] = useState("");
  const [exitSubmitted, setExitSubmitted] = useState(false);
  const exitShown = useRef(false);

  useEffect(() => {
    const handleMouseLeave = (e: MouseEvent) => {
      if (
        e.clientY <= 0 &&
        !exitShown.current &&
        !submitted &&
        lastSavedStep.current === 0
      ) {
        exitShown.current = true;
        setShowExitPopup(true);
      }
    };
    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [submitted]);

  const handleExitSubmit = () => {
    if (exitPhone.replace(/\s/g, "").length < 7) return;
    console.log(
      "📞 EXIT-INTENT CALLBACK REQUEST:",
      JSON.stringify({ phone: exitPhone, capturedAt: new Date().toISOString() }, null, 2)
    );
    setExitSubmitted(true);
    setTimeout(() => setShowExitPopup(false), 2500);
  };

  // ─── URGENCY: SPOTS REMAINING ─────────────────────────────────
  const [spotsLeft] = useState(() => {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    return (seed % 4) + 2;
  });

  // ─── SCROLL TO TOP ON STEP CHANGE ──────────────────────────────
  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentStep]);

  // ─── TAP FEEDBACK STATE ─────────────────────────────────────────
  const [tappedOption, setTappedOption] = useState<string | null>(null);
  const triggerTap = (key: string) => {
    setTappedOption(key);
    setTimeout(() => setTappedOption(null), 200);
  };

  // ─── PROGRESSIVE LEAD CAPTURE ─────────────────────────────────
  const saveProgress = useCallback(
    (stepJustCompleted: number, data: FormData) => {
      if (stepJustCompleted <= lastSavedStep.current) return;
      lastSavedStep.current = stepJustCompleted;

      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        ...(stepJustCompleted >= 2 && { concerns: data.concerns }),
        ...(stepJustCompleted >= 3 && { treatment: data.treatment }),
        completedSteps: stepJustCompleted,
        status: "partial",
        updatedAt: new Date().toISOString(),
      };

      console.log(
        `💾 PROGRESS SAVED (step ${stepJustCompleted}/4):`,
        JSON.stringify(payload, null, 2)
      );
    },
    []
  );

  useEffect(() => {
    const handleUnload = () => {
      if (lastSavedStep.current === 0 && currentStep === 1) {
        if (formData.firstName.trim() && formData.email.trim()) {
          saveProgress(1, formData);
        }
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, [currentStep, formData, saveProgress]);

  // ─── VALIDATION ───────────────────────────────────────────────
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (!formData.firstName.trim()) newErrors.firstName = "Please enter your first name";
      if (!formData.lastName.trim()) newErrors.lastName = "Please enter your last name";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = "Please enter a valid email address";
      if (formData.phone.replace(/\s/g, "").length < 7) newErrors.phone = "Please enter your phone number";
    }
    if (step === 2 && formData.concerns.length === 0) newErrors.concerns = "Please select at least one option";
    if (step === 3 && !formData.treatment) newErrors.treatment = "Please select an option";
    if (step === 4 && !formData.timeline) newErrors.timeline = "Please select a timeline";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── NAVIGATION ───────────────────────────────────────────────
  const nextStep = () => {
    if (!validateStep(currentStep)) return;
    const updatedData = { ...formData, completedSteps: Math.max(formData.completedSteps, currentStep) };
    setFormData(updatedData);
    saveProgress(currentStep, updatedData);
    if (currentStep < 4) { setCurrentStep((s) => s + 1); setErrors({}); }
  };

  const prevStep = () => {
    if (currentStep > 1) { setCurrentStep((s) => s - 1); setErrors({}); }
  };

  const toggleConcern = (value: string) => {
    triggerTap(`concern-${value}`);
    setFormData((prev) => ({
      ...prev,
      concerns: prev.concerns.includes(value) ? prev.concerns.filter((c) => c !== value) : [...prev.concerns, value],
    }));
    setErrors((prev) => { const next = { ...prev }; delete next.concerns; return next; });
  };

  // ─── AUTO-ADVANCE for single-select steps ─────────────────────
  const selectTreatmentAndAdvance = (value: string) => {
    triggerTap(`treatment-${value}`);
    const updated = { ...formData, treatment: value, completedSteps: Math.max(formData.completedSteps, 3) };
    setFormData(updated);
    setErrors({});
    saveProgress(3, updated);
    setTimeout(() => setCurrentStep(4), 300);
  };

  const selectTimelineAndContinue = (value: string) => {
    triggerTap(`timeline-${value}`);
    setFormData((prev) => ({ ...prev, timeline: value }));
    setErrors((prev) => { const next = { ...prev }; delete next.timeline; return next; });
  };

  // ─── SUBMIT ───────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!validateStep(4)) return;
    setSubmitting(true);
    const finalData = { ...formData, completedSteps: 4, submittedAt: new Date().toISOString() };
    console.log("✅ FULL FORM SUBMITTED:", JSON.stringify(finalData, null, 2));
    setTimeout(() => { setSubmitted(true); setSubmitting(false); }, 1200);
  };

  // ─── RENDER ───────────────────────────────────────────────────
  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap");

        :root {
          --primary: #1b4d6e;
          --primary-light: #2a6f9a;
          --accent: #e8a54b;
          --accent-hover: #d4922f;
          --bg: #f7f4ef;
          --bg-card: #ffffff;
          --text: #1a1a1a;
          --text-muted: #6b7280;
          --text-light: #9ca3af;
          --border: #e5e1da;
          --success: #2d8a56;
          --error: #d14343;
          --radius: 14px;
          --shadow: 0 4px 24px rgba(27, 77, 110, 0.08);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: "DM Sans", sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes tapBounce {
          0% { transform: scale(1); }
          50% { transform: scale(0.96); }
          100% { transform: scale(1); }
        }

        /* ── MOBILE STYLES ── */
        @media (max-width: 640px) {
          .page-wrapper {
            padding: 10px 16px 100px !important;
            justify-content: flex-start !important;
            align-items: stretch !important;
          }
          .urgency-banner {
            margin-bottom: 10px !important;
            padding: 8px 12px !important;
            font-size: 12px !important;
          }
          .page-header {
            margin-bottom: 10px !important;
          }
          .logo-mark {
            width: 40px !important;
            height: 40px !important;
            border-radius: 12px !important;
          }
          .header-title {
            font-size: 20px !important;
            margin-bottom: 4px !important;
          }
          .header-subtitle {
            font-size: 13px !important;
            margin-bottom: 6px !important;
          }
          .finance-badge {
            font-size: 12px !important;
            padding: 6px 12px !important;
          }
          /* Compact progress: hide step labels, show compact indicator */
          .step-labels-desktop {
            display: none !important;
          }
          .step-indicator-mobile {
            display: flex !important;
          }
          /* Single column concern grid */
          .concern-grid {
            grid-template-columns: 1fr !important;
          }
          /* Larger touch targets */
          .option-card-touch {
            min-height: 56px !important;
            padding: 16px !important;
          }
          .option-item-touch {
            min-height: 52px !important;
            padding: 16px !important;
          }
          /* Full-width stacked buttons */
          .btn-row-mobile {
            flex-direction: column !important;
          }
          .btn-row-mobile button {
            width: 100% !important;
            flex: none !important;
          }
          /* Form card padding */
          .form-card {
            padding: 24px 18px !important;
          }
          /* Sticky CTA */
          .sticky-cta {
            display: flex !important;
          }
          /* Hide inline CTA on mobile when sticky is showing */
          .inline-cta {
            display: none !important;
          }
          /* Exit popup mobile */
          .exit-popup {
            padding: 28px 20px !important;
            margin: 0 12px !important;
            border-radius: 16px !important;
          }
        }

        /* Desktop: hide mobile-only elements */
        @media (min-width: 641px) {
          .step-indicator-mobile {
            display: none !important;
          }
          .sticky-cta {
            display: none !important;
          }
        }
      `}</style>

      <div style={s.pageWrapper} className="page-wrapper">
        <div style={s.orbTopRight} />
        <div style={s.orbBottomLeft} />

        <div style={s.container}>

          {/* ── URGENCY BANNER ── */}
          <div style={s.urgencyBanner} className="urgency-banner">
            <span style={s.urgencyDot} />
            <span suppressHydrationWarning>
              <strong>Only {spotsLeft} free consultation slots left</strong> this month
            </span>
          </div>

          {/* ── HEADER ── */}
          <div style={s.header} className="page-header">
            <div style={s.logoRow}>
              <div style={s.logoMark} className="logo-mark">
                <svg viewBox="0 0 64 64" width={30} height={30} fill="none">
                  <path d="M32 4c-5.5 0-10 1.5-13.5 4.5C15 11.5 13 16 13 21c0 4 1 7.5 2.5 11 1.5 3.5 2.5 7 3 10.5.8 5 2 10 3.5 13.5 1 2.3 2.5 4 4 4s2.5-1 3-3c.5-2 1-4.5 1.5-7h3c.5 2.5 1 5 1.5 7 .5 2 1.5 3 3 3s3-1.7 4-4c1.5-3.5 2.7-8.5 3.5-13.5.5-3.5 1.5-7 3-10.5C50 28.5 51 25 51 21c0-5-2-9.5-5.5-12.5C42 5.5 37.5 4 32 4z" fill="white" />
                  <path d="M25 26c2 3 4.5 4.5 7 4.5s5-1.5 7-4.5" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" fill="none" />
                </svg>
              </div>
              <span style={s.brandName}>CAB Orthodontics</span>
            </div>
            <h1 style={s.headerTitle} className="header-title">Start Your Smile Journey</h1>
            <p style={s.headerSubtitle} className="header-subtitle">Book your free consultation in under 2 minutes</p>

            {/* ── FINANCE MESSAGING ── */}
            <div style={s.financeBadge} className="finance-badge">
              Treatments from <strong>£49/month</strong> · 0% finance available
            </div>
          </div>

          {!submitted && (
            <>
              {/* Desktop step labels */}
              <div style={s.stepLabelRow} className="step-labels-desktop">
                {STEP_LABELS.map((label, i) => (
                  <span key={label} style={{ ...s.stepLabelText, color: i + 1 === currentStep ? "var(--primary)" : "var(--text-light)" }}>
                    {label}
                  </span>
                ))}
              </div>

              {/* Mobile compact indicator */}
              <div style={s.mobileStepIndicator} className="step-indicator-mobile">
                <span style={s.mobileStepText}>
                  Step {currentStep} of 4 — <strong>{STEP_LABELS[currentStep - 1]}</strong>
                </span>
              </div>

              {/* Progress bar */}
              <div style={s.progressBar}>
                {[1, 2, 3, 4].map((step) => (
                  <div key={step} style={{
                    ...s.progressStep,
                    background: step < currentStep ? "var(--accent)" : step === currentStep ? "var(--primary)" : "var(--border)",
                    boxShadow: step === currentStep ? "0 1px 6px rgba(27,77,110,0.3)" : "none",
                  }} />
                ))}
              </div>
            </>
          )}

          {/* ── CARD ── */}
          <div ref={cardRef} style={s.card} className="form-card">
            <div style={s.cardTopBorder} />

            {/* STEP 1: Contact Details */}
            {currentStep === 1 && !submitted && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <h2 style={s.stepTitle}>Let&apos;s get started</h2>
                <p style={s.stepSubtitle}>Enter your details so we can personalise your smile journey</p>

                {([
                  { id: "firstName", label: "First Name", placeholder: "e.g. Sarah", type: "text", inputMode: "text" as const },
                  { id: "lastName", label: "Last Name", placeholder: "e.g. Thompson", type: "text", inputMode: "text" as const },
                  { id: "email", label: "Email Address", placeholder: "sarah@example.com", type: "email", inputMode: "email" as const },
                  { id: "phone", label: "Phone Number", placeholder: "e.g. 07700 900000", type: "tel", inputMode: "tel" as const },
                ] as const).map((field) => (
                  <div key={field.id} style={s.fieldGroup}>
                    <label style={s.label}>
                      {field.label} <span style={{ color: "var(--error)", marginLeft: 2 }}>*</span>
                    </label>
                    <input
                      type={field.type}
                      inputMode={field.inputMode}
                      placeholder={field.placeholder}
                      value={formData[field.id]}
                      onChange={(e) => {
                        setFormData((prev) => ({ ...prev, [field.id]: e.target.value }));
                        setErrors((prev) => { const next = { ...prev }; delete next[field.id]; return next; });
                      }}
                      style={{
                        ...s.input,
                        borderColor: errors[field.id] ? "var(--error)" : "var(--border)",
                        boxShadow: errors[field.id] ? "0 0 0 3px rgba(209,67,67,0.1)" : "none",
                      }}
                    />
                    {errors[field.id] && <span style={s.fieldError}>{errors[field.id]}</span>}
                  </div>
                ))}

                <p style={s.privacyNote}>
                  <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="currentColor" strokeWidth={2} style={{ marginRight: 4, verticalAlign: "middle" }}>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0110 0v4" />
                  </svg>
                  We&apos;ll never share your details. 100% confidential.
                </p>

                <div style={s.btnRow} className="btn-row-mobile inline-cta">
                  <button style={s.btnPrimary} onClick={nextStep}>Continue →</button>
                </div>
              </div>
            )}

            {/* STEP 2: Smile Concerns */}
            {currentStep === 2 && !submitted && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <h2 style={s.stepTitle}>What brings you in?</h2>
                <p style={s.stepSubtitle}>Select the concerns you&apos;d like to address (choose all that apply)</p>

                <div style={s.optionGrid} className="concern-grid">
                  {CONCERN_OPTIONS.map((opt) => {
                    const selected = formData.concerns.includes(opt.value);
                    const isTapped = tappedOption === `concern-${opt.value}`;
                    return (
                      <div key={opt.value} onClick={() => toggleConcern(opt.value)} className="option-card-touch" style={{
                        ...s.optionCard,
                        borderColor: selected ? "var(--primary)" : "var(--border)",
                        background: selected ? "rgba(27,77,110,0.06)" : "var(--bg)",
                        boxShadow: selected ? "0 0 0 3px rgba(27,77,110,0.1)" : "none",
                        animation: isTapped ? "tapBounce 0.2s ease-out" : "none",
                      }}>
                        {selected && (
                          <div style={s.checkMark}>
                            <svg viewBox="0 0 24 24" width={12} height={12} fill="none" stroke="white" strokeWidth={3}>
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                        <span style={s.optionIcon}>{opt.icon}</span>
                        <span style={s.optionLabel}>{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
                {errors.concerns && <p style={s.selectionError}>{errors.concerns}</p>}

                <p style={s.stepEncouragement}>Great progress — just 2 quick questions left!</p>

                <div style={s.btnRow} className="btn-row-mobile inline-cta">
                  <button style={s.btnSecondary} onClick={prevStep}>← Back</button>
                  <button style={s.btnPrimary} onClick={nextStep}>Continue →</button>
                </div>
              </div>
            )}

            {/* STEP 3: Treatment Preference (auto-advance) */}
            {currentStep === 3 && !submitted && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <h2 style={s.stepTitle}>Preferred treatment</h2>
                <p style={s.stepSubtitle}>Which treatment are you most interested in?</p>

                <div style={s.optionList}>
                  {TREATMENT_OPTIONS.map((opt) => {
                    const selected = formData.treatment === opt.value;
                    const isTapped = tappedOption === `treatment-${opt.value}`;
                    return (
                      <div key={opt.value} onClick={() => selectTreatmentAndAdvance(opt.value)} className="option-item-touch" style={{
                        ...s.optionItem,
                        borderColor: selected ? "var(--primary)" : "var(--border)",
                        background: selected ? "rgba(27,77,110,0.06)" : "var(--bg)",
                        boxShadow: selected ? "0 0 0 3px rgba(27,77,110,0.1)" : "none",
                        animation: isTapped ? "tapBounce 0.2s ease-out" : "none",
                      }}>
                        <div style={{
                          ...s.radioCircle,
                          borderColor: selected ? "var(--primary)" : "var(--border)",
                          background: selected ? "var(--primary)" : "transparent",
                        }}>
                          {selected && <div style={s.radioDot} />}
                        </div>
                        <span style={s.optionText}>{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
                {errors.treatment && <p style={s.selectionError}>{errors.treatment}</p>}

                <p style={s.stepEncouragement}>Nearly there — one final step!</p>

                <div style={s.btnRow} className="btn-row-mobile inline-cta">
                  <button style={s.btnSecondary} onClick={prevStep}>← Back</button>
                  <button style={s.btnPrimary} onClick={nextStep}>Continue →</button>
                </div>
              </div>
            )}

            {/* STEP 4: Timeline */}
            {currentStep === 4 && !submitted && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <h2 style={s.stepTitle}>Your timeline</h2>
                <p style={s.stepSubtitle}>When are you looking to start treatment?</p>

                <div style={s.optionList}>
                  {TIMELINE_OPTIONS.map((opt) => {
                    const selected = formData.timeline === opt.value;
                    const isTapped = tappedOption === `timeline-${opt.value}`;
                    return (
                      <div key={opt.value} onClick={() => selectTimelineAndContinue(opt.value)} className="option-item-touch" style={{
                        ...s.optionItem,
                        borderColor: selected ? "var(--primary)" : "var(--border)",
                        background: selected ? "rgba(27,77,110,0.06)" : "var(--bg)",
                        boxShadow: selected ? "0 0 0 3px rgba(27,77,110,0.1)" : "none",
                        animation: isTapped ? "tapBounce 0.2s ease-out" : "none",
                      }}>
                        <div style={{
                          ...s.radioCircle,
                          borderColor: selected ? "var(--primary)" : "var(--border)",
                          background: selected ? "var(--primary)" : "transparent",
                        }}>
                          {selected && <div style={s.radioDot} />}
                        </div>
                        <span style={s.optionText}>{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
                {errors.timeline && <p style={s.selectionError}>{errors.timeline}</p>}

                <div style={{ marginTop: 20 }}>
                  <label style={s.label}>Have you had orthodontic treatment before?</label>
                  <div style={{ ...s.optionList, marginTop: 8 }}>
                    {["Yes", "No"].map((opt) => {
                      const val = opt.toLowerCase();
                      const selected = formData.previousTreatment === val;
                      const isTapped = tappedOption === `prev-${val}`;
                      return (
                        <div key={val} onClick={() => {
                          triggerTap(`prev-${val}`);
                          setFormData((prev) => ({ ...prev, previousTreatment: val }));
                        }} className="option-item-touch" style={{
                          ...s.optionItem,
                          borderColor: selected ? "var(--primary)" : "var(--border)",
                          background: selected ? "rgba(27,77,110,0.06)" : "var(--bg)",
                          boxShadow: selected ? "0 0 0 3px rgba(27,77,110,0.1)" : "none",
                          animation: isTapped ? "tapBounce 0.2s ease-out" : "none",
                        }}>
                          <div style={{
                            ...s.radioCircle,
                            borderColor: selected ? "var(--primary)" : "var(--border)",
                            background: selected ? "var(--primary)" : "transparent",
                          }}>
                            {selected && <div style={s.radioDot} />}
                          </div>
                          <span style={s.optionText}>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={s.btnRow} className="btn-row-mobile inline-cta">
                  <button style={s.btnSecondary} onClick={prevStep}>← Back</button>
                  <button style={{
                    ...s.btnSubmit,
                    opacity: submitting ? 0.7 : 1,
                    pointerEvents: submitting ? "none" : "auto",
                  }} onClick={handleSubmit}>
                    {submitting ? "Submitting..." : "Book Free Consultation"}
                  </button>
                </div>
              </div>
            )}

            {/* SUCCESS */}
            {submitted && (
              <div style={{ textAlign: "center", padding: "20px 0", animation: "scaleIn 0.5s ease-out" }}>
                <div style={s.successIcon}>
                  <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="white" strokeWidth={2.5}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 style={s.successTitle}>You&apos;re All Set!</h2>
                <p style={s.successText}>
                  Thank you for taking the first step. Our team will be in touch within 24 hours to book your free consultation.
                </p>
              </div>
            )}
          </div>

          {/* Trust badges */}
          <div style={s.trustRow}>
            <TrustBadge icon="shield" text="100% Confidential" />
            <TrustBadge icon="check" text="Free Consultation" />
            <TrustBadge icon="clock" text="2 Min to Complete" />
          </div>
        </div>
      </div>

      {/* ── STICKY CTA (mobile only) ── */}
      {!submitted && (
        <div style={s.stickyCta} className="sticky-cta">
          {currentStep > 1 && (
            <button style={s.stickyBtnSecondary} onClick={prevStep}>← Back</button>
          )}
          {currentStep < 4 ? (
            <button style={s.stickyBtnPrimary} onClick={nextStep}>Continue →</button>
          ) : (
            <button style={{
              ...s.stickyBtnSubmit,
              opacity: submitting ? 0.7 : 1,
              pointerEvents: submitting ? "none" : "auto",
            }} onClick={handleSubmit}>
              {submitting ? "Submitting..." : "Book Free Consultation"}
            </button>
          )}
        </div>
      )}

      {/* ── EXIT-INTENT POPUP ── */}
      {showExitPopup && (
        <div style={s.exitOverlay} onClick={() => setShowExitPopup(false)}>
          <div style={s.exitPopup} className="exit-popup" onClick={(e) => e.stopPropagation()}>
            <button style={s.exitClose} onClick={() => setShowExitPopup(false)}>✕</button>

            {!exitSubmitted ? (
              <>
                <div style={s.exitIcon}>📞</div>
                <h3 style={s.exitTitle}>Wait — want us to call you instead?</h3>
                <p style={s.exitSubtitle}>
                  Leave your number and we&apos;ll ring you back within 15 minutes. No forms, no fuss.
                </p>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="Your phone number"
                  value={exitPhone}
                  onChange={(e) => setExitPhone(e.target.value)}
                  style={s.exitInput}
                />
                <button style={s.exitBtn} onClick={handleExitSubmit}>
                  Call Me Back
                </button>
                <p style={s.exitDisclaimer}>
                  We&apos;ll only use this to arrange your free consultation
                </p>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
                <h3 style={s.exitTitle}>We&apos;ll call you shortly!</h3>
                <p style={s.exitSubtitle}>Expect a call within 15 minutes.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── TRUST BADGE ──────────────────────────────────────────────────
function TrustBadge({ icon, text }: { icon: string; text: string }) {
  const paths: Record<string, React.ReactNode> = {
    shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    check: <><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>,
    clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  };
  return (
    <div style={s.trustItem}>
      <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="var(--text-light)" strokeWidth={2}>
        {paths[icon]}
      </svg>
      <span>{text}</span>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  pageWrapper: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px 20px 40px",
    position: "relative",
    overflow: "hidden",
  },

  orbTopRight: {
    position: "fixed", top: "-30%", right: "-20%",
    width: 600, height: 600, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(27,77,110,0.06) 0%, transparent 70%)",
    pointerEvents: "none",
  },

  orbBottomLeft: {
    position: "fixed", bottom: "-20%", left: "-15%",
    width: 500, height: 500, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(232,165,75,0.07) 0%, transparent 70%)",
    pointerEvents: "none",
  },

  container: { width: "100%", maxWidth: 520, position: "relative", zIndex: 1 },

  // ── Urgency banner
  urgencyBanner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    background: "linear-gradient(135deg, #1b4d6e, #2a6f9a)",
    color: "white",
    padding: "10px 16px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 20,
    animation: "fadeDown 0.5s ease-out",
  },

  urgencyDot: {
    width: 8, height: 8,
    borderRadius: "50%",
    background: "#E8A54B",
    animation: "pulse 2s ease-in-out infinite",
    flexShrink: 0,
  },

  // ── Header
  header: { textAlign: "center", marginBottom: 20, animation: "fadeDown 0.6s ease-out" },

  logoRow: { display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 14 },

  logoMark: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 52, height: 52, background: "var(--primary)",
    borderRadius: 16, boxShadow: "0 4px 16px rgba(27,77,110,0.25)", flexShrink: 0,
  },

  brandName: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 20, color: "var(--primary)", letterSpacing: "-0.01em", lineHeight: 1.2,
  },

  headerTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 28, fontWeight: 400, color: "var(--primary)", lineHeight: 1.2, marginBottom: 8,
  },

  headerSubtitle: { color: "var(--text-muted)", fontSize: 15, lineHeight: 1.5, marginBottom: 10 },

  financeBadge: {
    display: "inline-block",
    background: "rgba(232,165,75,0.12)",
    color: "#8B6020",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    border: "1px solid rgba(232,165,75,0.25)",
  },

  // ── Step labels & progress
  stepLabelRow: {
    display: "flex", justifyContent: "space-between",
    marginBottom: 8, padding: "0 4px",
    animation: "fadeDown 0.6s ease-out 0.1s both",
  },

  stepLabelText: {
    fontSize: 12, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.08em", transition: "color 0.3s",
  },

  mobileStepIndicator: {
    display: "none",
    justifyContent: "center",
    marginBottom: 8,
    animation: "fadeDown 0.6s ease-out 0.1s both",
  },

  mobileStepText: {
    fontSize: 13, color: "var(--text-muted)", fontWeight: 500,
  },

  progressBar: {
    display: "flex", alignItems: "center", gap: 6,
    marginBottom: 24, padding: "0 4px",
    animation: "fadeDown 0.6s ease-out 0.1s both",
  },

  progressStep: {
    flex: 1, height: 5, borderRadius: 100,
    transition: "background 0.5s ease, box-shadow 0.5s ease",
  },

  // ── Card
  card: {
    background: "var(--bg-card)", borderRadius: "var(--radius)",
    boxShadow: "var(--shadow)", padding: "36px 32px",
    position: "relative", overflow: "hidden",
    border: "1px solid rgba(0,0,0,0.04)",
    scrollMarginTop: 10,
  },

  cardTopBorder: {
    position: "absolute", top: 0, left: 0, right: 0, height: 3,
    background: "linear-gradient(90deg, var(--primary), var(--accent))",
  },

  stepTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 22, color: "var(--primary)", marginBottom: 6,
  },

  stepSubtitle: { color: "var(--text-muted)", fontSize: 14, marginBottom: 28, lineHeight: 1.5 },

  stepEncouragement: {
    fontSize: 13, color: "var(--success)", fontWeight: 500,
    textAlign: "center", marginTop: 4,
  },

  // ── Form fields
  fieldGroup: { marginBottom: 18 },

  label: {
    display: "block", fontSize: 13, fontWeight: 600,
    color: "var(--text)", marginBottom: 7, letterSpacing: "0.01em",
  },

  input: {
    width: "100%", padding: "13px 16px",
    border: "1.5px solid var(--border)", borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif", fontSize: 16,
    color: "var(--text)", background: "var(--bg)",
    outline: "none", transition: "border-color 0.25s, box-shadow 0.25s, background 0.25s",
  },

  fieldError: { fontSize: 12, color: "var(--error)", marginTop: 5, display: "block" },

  privacyNote: {
    fontSize: 12, color: "var(--text-light)", marginTop: 4, marginBottom: 0,
    display: "flex", alignItems: "center",
  },

  // ── Options
  optionGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 },

  optionCard: {
    position: "relative", padding: "16px 14px",
    border: "1.5px solid var(--border)", borderRadius: 12,
    cursor: "pointer", transition: "all 0.25s ease", textAlign: "center",
    minHeight: 48,
  },

  checkMark: {
    position: "absolute", top: 8, right: 8, width: 20, height: 20,
    borderRadius: "50%", background: "var(--primary)",
    display: "flex", alignItems: "center", justifyContent: "center",
  },

  optionIcon: { fontSize: 26, marginBottom: 8, display: "block" },

  optionLabel: { fontSize: 13, fontWeight: 600, color: "var(--text)", lineHeight: 1.3 },

  optionList: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 },

  optionItem: {
    display: "flex", alignItems: "center", gap: 12, padding: "14px 16px",
    border: "1.5px solid var(--border)", borderRadius: 12,
    cursor: "pointer", transition: "all 0.25s ease",
    minHeight: 48,
  },

  radioCircle: {
    width: 20, height: 20, borderRadius: "50%", border: "2px solid var(--border)",
    flexShrink: 0, transition: "all 0.25s", position: "relative",
    display: "flex", alignItems: "center", justifyContent: "center",
  },

  radioDot: { width: 8, height: 8, borderRadius: "50%", background: "white" },

  optionText: { fontSize: 14, fontWeight: 500, color: "var(--text)" },

  selectionError: { fontSize: 12, color: "var(--error)", marginTop: -10, marginBottom: 12 },

  // ── Buttons
  btnRow: { display: "flex", gap: 10, marginTop: 28 },

  btnPrimary: {
    flex: 1, padding: "14px 24px", borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 600,
    cursor: "pointer", border: "none", background: "var(--primary)",
    color: "white", boxShadow: "0 4px 14px rgba(27,77,110,0.3)",
    transition: "all 0.25s ease",
  },

  btnSecondary: {
    padding: "14px 20px", borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 600,
    cursor: "pointer", background: "transparent", color: "var(--text-muted)",
    border: "1.5px solid var(--border)", transition: "all 0.25s ease",
  },

  btnSubmit: {
    flex: 1, padding: "14px 24px", borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 600,
    cursor: "pointer", border: "none", background: "var(--accent)",
    color: "white", boxShadow: "0 4px 14px rgba(232,165,75,0.35)",
    transition: "all 0.25s ease",
  },

  // ── Sticky CTA (mobile)
  stickyCta: {
    display: "none",
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "12px 16px",
    paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
    background: "white",
    borderTop: "1px solid var(--border)",
    boxShadow: "0 -4px 20px rgba(0,0,0,0.08)",
    gap: 10,
    zIndex: 100,
  },

  stickyBtnPrimary: {
    flex: 1, padding: "16px 24px", borderRadius: 12,
    fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 600,
    cursor: "pointer", border: "none", background: "var(--primary)",
    color: "white", boxShadow: "0 4px 14px rgba(27,77,110,0.3)",
  },

  stickyBtnSecondary: {
    padding: "16px 20px", borderRadius: 12,
    fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 600,
    cursor: "pointer", background: "transparent", color: "var(--text-muted)",
    border: "1.5px solid var(--border)",
  },

  stickyBtnSubmit: {
    flex: 1, padding: "16px 24px", borderRadius: 12,
    fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 600,
    cursor: "pointer", border: "none", background: "var(--accent)",
    color: "white", boxShadow: "0 4px 14px rgba(232,165,75,0.35)",
  },

  // ── Success
  successIcon: {
    width: 72, height: 72, borderRadius: "50%",
    background: "linear-gradient(135deg, var(--success), #34A065)",
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    marginBottom: 20, boxShadow: "0 8px 24px rgba(45,138,86,0.3)",
  },

  successTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 24, color: "var(--primary)", marginBottom: 10,
  },

  successText: { color: "var(--text-muted)", fontSize: 14, lineHeight: 1.6, maxWidth: 340, margin: "0 auto" },

  // ── Trust badges
  trustRow: {
    display: "flex", justifyContent: "center", gap: 24, marginTop: 20,
    animation: "fadeDown 0.6s ease-out 0.3s both",
  },

  trustItem: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-light)" },

  // ── Exit-intent popup
  exitOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 9999, padding: 20, backdropFilter: "blur(4px)",
    animation: "fadeIn 0.3s ease-out",
  },

  exitPopup: {
    background: "white", borderRadius: 20, padding: "36px 32px",
    maxWidth: 400, width: "100%", position: "relative",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    animation: "slideUp 0.4s ease-out",
    textAlign: "center",
  },

  exitClose: {
    position: "absolute", top: 14, right: 16,
    background: "none", border: "none", fontSize: 20,
    color: "var(--text-light)", cursor: "pointer",
    width: 32, height: 32, borderRadius: "50%",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "background 0.2s",
  },

  exitIcon: { fontSize: 48, marginBottom: 12 },

  exitTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 22, color: "var(--primary)", marginBottom: 8,
  },

  exitSubtitle: {
    fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 20,
  },

  exitInput: {
    width: "100%", padding: "14px 16px",
    border: "1.5px solid var(--border)", borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif", fontSize: 16,
    color: "var(--text)", background: "var(--bg)",
    outline: "none", marginBottom: 12,
    textAlign: "center",
  },

  exitBtn: {
    width: "100%", padding: "14px 24px", borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 600,
    cursor: "pointer", border: "none",
    background: "var(--accent)", color: "white",
    boxShadow: "0 4px 14px rgba(232,165,75,0.35)",
    transition: "all 0.25s ease",
  },

  exitDisclaimer: {
    fontSize: 11, color: "var(--text-light)", marginTop: 12,
  },
};