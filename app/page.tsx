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

// ─── CONCERN OPTIONS ──────────────────────────────────────────────
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

  // ─── PROGRESSIVE LEAD CAPTURE ─────────────────────────────────
  // Fires after EVERY step so you always have the most recent data.
  // Each save includes completedSteps + status so your CRM can see
  // exactly where they dropped off.
  //
  // Step 1 → contact details only
  // Step 2 → + smile concerns
  // Step 3 → + treatment preference
  // Step 4 → full submission (handled in handleSubmit)

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

      // ── Replace with your endpoint ──
      // fetch('https://your-webhook-url.com/leads', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload)
      // });
    },
    []
  );

  // Fallback: capture on page unload if they filled step 1 fields
  // but never pressed Continue
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
      if (!formData.firstName.trim())
        newErrors.firstName = "Please enter your first name";
      if (!formData.lastName.trim())
        newErrors.lastName = "Please enter your last name";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
        newErrors.email = "Please enter a valid email address";
      if (formData.phone.replace(/\s/g, "").length < 7)
        newErrors.phone = "Please enter your phone number";
    }

    if (step === 2 && formData.concerns.length === 0) {
      newErrors.concerns = "Please select at least one option";
    }

    if (step === 3 && !formData.treatment) {
      newErrors.treatment = "Please select an option";
    }

    if (step === 4 && !formData.timeline) {
      newErrors.timeline = "Please select a timeline";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ─── NAVIGATION ───────────────────────────────────────────────
  const nextStep = () => {
    if (!validateStep(currentStep)) return;

    const updatedData = {
      ...formData,
      completedSteps: Math.max(formData.completedSteps, currentStep),
    };

    setFormData(updatedData);

    // 🔑 Save progress after every step
    saveProgress(currentStep, updatedData);

    if (currentStep < 4) {
      setCurrentStep((s) => s + 1);
      setErrors({});
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1);
      setErrors({});
    }
  };

  // ─── CONCERN TOGGLE ───────────────────────────────────────────
  const toggleConcern = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      concerns: prev.concerns.includes(value)
        ? prev.concerns.filter((c) => c !== value)
        : [...prev.concerns, value],
    }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.concerns;
      return next;
    });
  };

  // ─── SUBMIT ───────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!validateStep(4)) return;
    setSubmitting(true);

    const finalData = {
      ...formData,
      completedSteps: 4,
      submittedAt: new Date().toISOString(),
    };

    console.log(
      "✅ FULL FORM SUBMITTED:",
      JSON.stringify(finalData, null, 2)
    );

    // ── Replace with your endpoint ──
    // fetch('https://your-webhook-url.com/leads', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ ...finalData, status: 'complete' })
    // });

    setTimeout(() => {
      setSubmitted(true);
      setSubmitting(false);
    }, 1200);
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

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: "DM Sans", sans-serif;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>

      <div style={styles.pageWrapper}>
        {/* Background orbs */}
        <div style={styles.orbTopRight} />
        <div style={styles.orbBottomLeft} />

        <div style={styles.container}>
          {/* Header */}
          <div style={styles.header}>
            <div style={styles.logoRow}>
              <div style={styles.logoMark}>
                <svg viewBox="0 0 64 64" width={30} height={30} fill="none">
                  {/* Tooth icon */}
                  <path
                    d="M32 4c-5.5 0-10 1.5-13.5 4.5C15 11.5 13 16 13 21c0 4 1 7.5 2.5 11 1.5 3.5 2.5 7 3 10.5.8 5 2 10 3.5 13.5 1 2.3 2.5 4 4 4s2.5-1 3-3c.5-2 1-4.5 1.5-7h3c.5 2.5 1 5 1.5 7 .5 2 1.5 3 3 3s3-1.7 4-4c1.5-3.5 2.7-8.5 3.5-13.5.5-3.5 1.5-7 3-10.5C50 28.5 51 25 51 21c0-5-2-9.5-5.5-12.5C42 5.5 37.5 4 32 4z"
                    fill="white"
                  />
                  {/* Smile arc on the tooth */}
                  <path
                    d="M25 26c2 3 4.5 4.5 7 4.5s5-1.5 7-4.5"
                    stroke="var(--primary)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </div>
              <div>
                <span style={styles.brandName}>JXB Ortho</span>
              </div>
            </div>
            <h1 style={styles.headerTitle}>Start Your Smile Journey</h1>
            <p style={styles.headerSubtitle}>
              Book your free consultation in under 2 minutes
            </p>
          </div>

          {!submitted && (
            <>
              {/* Step labels */}
              <div style={styles.stepLabelRow}>
                {STEP_LABELS.map((label, i) => (
                  <span
                    key={label}
                    style={{
                      ...styles.stepLabelText,
                      color:
                        i + 1 === currentStep
                          ? "var(--primary)"
                          : "var(--text-light)",
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>

              {/* Progress bar */}
              <div style={styles.progressBar}>
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    style={{
                      ...styles.progressStep,
                      background:
                        step < currentStep
                          ? "var(--accent)"
                          : step === currentStep
                          ? "var(--primary)"
                          : "var(--border)",
                      boxShadow:
                        step === currentStep
                          ? "0 1px 6px rgba(27,77,110,0.3)"
                          : "none",
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {/* Card */}
          <div style={styles.card}>
            <div style={styles.cardTopBorder} />

            {/* ── STEP 1: Contact Details ── */}
            {currentStep === 1 && !submitted && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <h2 style={styles.stepTitle}>Let&apos;s get started</h2>
                <p style={styles.stepSubtitle}>
                  Enter your details so we can personalise your smile journey
                </p>

                {(
                  [
                    {
                      id: "firstName",
                      label: "First Name",
                      placeholder: "e.g. Sarah",
                      type: "text",
                    },
                    {
                      id: "lastName",
                      label: "Last Name",
                      placeholder: "e.g. Thompson",
                      type: "text",
                    },
                    {
                      id: "email",
                      label: "Email Address",
                      placeholder: "sarah@example.com",
                      type: "email",
                    },
                    {
                      id: "phone",
                      label: "Phone Number",
                      placeholder: "e.g. 07700 900000",
                      type: "tel",
                    },
                  ] as const
                ).map((field) => (
                  <div key={field.id} style={styles.fieldGroup}>
                    <label style={styles.label}>
                      {field.label}{" "}
                      <span style={{ color: "var(--error)", marginLeft: 2 }}>
                        *
                      </span>
                    </label>
                    <input
                      type={field.type}
                      placeholder={field.placeholder}
                      value={formData[field.id]}
                      onChange={(e) => {
                        setFormData((prev) => ({
                          ...prev,
                          [field.id]: e.target.value,
                        }));
                        setErrors((prev) => {
                          const next = { ...prev };
                          delete next[field.id];
                          return next;
                        });
                      }}
                      style={{
                        ...styles.input,
                        borderColor: errors[field.id]
                          ? "var(--error)"
                          : "var(--border)",
                        boxShadow: errors[field.id]
                          ? "0 0 0 3px rgba(209,67,67,0.1)"
                          : "none",
                      }}
                    />
                    {errors[field.id] && (
                      <span style={styles.fieldError}>{errors[field.id]}</span>
                    )}
                  </div>
                ))}

                <div style={styles.btnRow}>
                  <button style={styles.btnPrimary} onClick={nextStep}>
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 2: Smile Concerns ── */}
            {currentStep === 2 && !submitted && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <h2 style={styles.stepTitle}>What brings you in?</h2>
                <p style={styles.stepSubtitle}>
                  Select the concerns you&apos;d like to address (choose all
                  that apply)
                </p>

                <div style={styles.optionGrid}>
                  {CONCERN_OPTIONS.map((opt) => {
                    const selected = formData.concerns.includes(opt.value);
                    return (
                      <div
                        key={opt.value}
                        onClick={() => toggleConcern(opt.value)}
                        style={{
                          ...styles.optionCard,
                          borderColor: selected
                            ? "var(--primary)"
                            : "var(--border)",
                          background: selected
                            ? "rgba(27,77,110,0.06)"
                            : "var(--bg)",
                          boxShadow: selected
                            ? "0 0 0 3px rgba(27,77,110,0.1)"
                            : "none",
                        }}
                      >
                        {selected && (
                          <div style={styles.checkMark}>
                            <svg
                              viewBox="0 0 24 24"
                              width={12}
                              height={12}
                              fill="none"
                              stroke="white"
                              strokeWidth={3}
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        )}
                        <span style={styles.optionIcon}>{opt.icon}</span>
                        <span style={styles.optionLabel}>{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
                {errors.concerns && (
                  <p style={styles.selectionError}>{errors.concerns}</p>
                )}

                <div style={styles.btnRow}>
                  <button style={styles.btnSecondary} onClick={prevStep}>
                    ← Back
                  </button>
                  <button style={styles.btnPrimary} onClick={nextStep}>
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 3: Treatment Preference ── */}
            {currentStep === 3 && !submitted && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <h2 style={styles.stepTitle}>Preferred treatment</h2>
                <p style={styles.stepSubtitle}>
                  Which treatment are you most interested in?
                </p>

                <div style={styles.optionList}>
                  {TREATMENT_OPTIONS.map((opt) => {
                    const selected = formData.treatment === opt.value;
                    return (
                      <div
                        key={opt.value}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            treatment: opt.value,
                          }));
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.treatment;
                            return next;
                          });
                        }}
                        style={{
                          ...styles.optionItem,
                          borderColor: selected
                            ? "var(--primary)"
                            : "var(--border)",
                          background: selected
                            ? "rgba(27,77,110,0.06)"
                            : "var(--bg)",
                          boxShadow: selected
                            ? "0 0 0 3px rgba(27,77,110,0.1)"
                            : "none",
                        }}
                      >
                        <div
                          style={{
                            ...styles.radioCircle,
                            borderColor: selected
                              ? "var(--primary)"
                              : "var(--border)",
                            background: selected
                              ? "var(--primary)"
                              : "transparent",
                          }}
                        >
                          {selected && <div style={styles.radioDot} />}
                        </div>
                        <span style={styles.optionText}>{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
                {errors.treatment && (
                  <p style={styles.selectionError}>{errors.treatment}</p>
                )}

                <div style={styles.btnRow}>
                  <button style={styles.btnSecondary} onClick={prevStep}>
                    ← Back
                  </button>
                  <button style={styles.btnPrimary} onClick={nextStep}>
                    Continue →
                  </button>
                </div>
              </div>
            )}

            {/* ── STEP 4: Timeline ── */}
            {currentStep === 4 && !submitted && (
              <div style={{ animation: "fadeIn 0.4s ease-out" }}>
                <h2 style={styles.stepTitle}>Your timeline</h2>
                <p style={styles.stepSubtitle}>
                  When are you looking to start treatment?
                </p>

                <div style={styles.optionList}>
                  {TIMELINE_OPTIONS.map((opt) => {
                    const selected = formData.timeline === opt.value;
                    return (
                      <div
                        key={opt.value}
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            timeline: opt.value,
                          }));
                          setErrors((prev) => {
                            const next = { ...prev };
                            delete next.timeline;
                            return next;
                          });
                        }}
                        style={{
                          ...styles.optionItem,
                          borderColor: selected
                            ? "var(--primary)"
                            : "var(--border)",
                          background: selected
                            ? "rgba(27,77,110,0.06)"
                            : "var(--bg)",
                          boxShadow: selected
                            ? "0 0 0 3px rgba(27,77,110,0.1)"
                            : "none",
                        }}
                      >
                        <div
                          style={{
                            ...styles.radioCircle,
                            borderColor: selected
                              ? "var(--primary)"
                              : "var(--border)",
                            background: selected
                              ? "var(--primary)"
                              : "transparent",
                          }}
                        >
                          {selected && <div style={styles.radioDot} />}
                        </div>
                        <span style={styles.optionText}>{opt.label}</span>
                      </div>
                    );
                  })}
                </div>
                {errors.timeline && (
                  <p style={styles.selectionError}>{errors.timeline}</p>
                )}

                {/* Previous treatment */}
                <div style={{ marginTop: 20 }}>
                  <label style={styles.label}>
                    Have you had orthodontic treatment before?
                  </label>
                  <div style={{ ...styles.optionList, marginTop: 8 }}>
                    {["Yes", "No"].map((opt) => {
                      const val = opt.toLowerCase();
                      const selected = formData.previousTreatment === val;
                      return (
                        <div
                          key={val}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              previousTreatment: val,
                            }))
                          }
                          style={{
                            ...styles.optionItem,
                            borderColor: selected
                              ? "var(--primary)"
                              : "var(--border)",
                            background: selected
                              ? "rgba(27,77,110,0.06)"
                              : "var(--bg)",
                            boxShadow: selected
                              ? "0 0 0 3px rgba(27,77,110,0.1)"
                              : "none",
                          }}
                        >
                          <div
                            style={{
                              ...styles.radioCircle,
                              borderColor: selected
                                ? "var(--primary)"
                                : "var(--border)",
                              background: selected
                                ? "var(--primary)"
                                : "transparent",
                            }}
                          >
                            {selected && <div style={styles.radioDot} />}
                          </div>
                          <span style={styles.optionText}>{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={styles.btnRow}>
                  <button style={styles.btnSecondary} onClick={prevStep}>
                    ← Back
                  </button>
                  <button
                    style={{
                      ...styles.btnSubmit,
                      opacity: submitting ? 0.7 : 1,
                      pointerEvents: submitting ? "none" : "auto",
                    }}
                    onClick={handleSubmit}
                  >
                    {submitting ? "Submitting..." : "Book Free Consultation"}
                  </button>
                </div>
              </div>
            )}

            {/* ── SUCCESS ── */}
            {submitted && (
              <div
                style={{
                  textAlign: "center",
                  padding: "20px 0",
                  animation: "scaleIn 0.5s ease-out",
                }}
              >
                <div style={styles.successIcon}>
                  <svg
                    viewBox="0 0 24 24"
                    width={32}
                    height={32}
                    fill="none"
                    stroke="white"
                    strokeWidth={2.5}
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 style={styles.successTitle}>You&apos;re All Set!</h2>
                <p style={styles.successText}>
                  Thank you for taking the first step. Our team will be in touch
                  within 24 hours to book your free consultation.
                </p>
              </div>
            )}
          </div>

          {/* Trust badges */}
          <div style={styles.trustRow}>
            <TrustBadge icon="shield" text="100% Confidential" />
            <TrustBadge icon="check" text="Free Consultation" />
            <TrustBadge icon="clock" text="2 Min to Complete" />
          </div>
        </div>
      </div>
    </>
  );
}

// ─── TRUST BADGE COMPONENT ────────────────────────────────────────
function TrustBadge({ icon, text }: { icon: string; text: string }) {
  const paths: Record<string, React.ReactNode> = {
    shield: (
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    ),
    check: (
      <>
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
  };

  return (
    <div style={styles.trustItem}>
      <svg
        viewBox="0 0 24 24"
        width={14}
        height={14}
        fill="none"
        stroke="var(--text-light)"
        strokeWidth={2}
      >
        {paths[icon]}
      </svg>
      <span>{text}</span>
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  pageWrapper: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },

  orbTopRight: {
    position: "fixed",
    top: "-30%",
    right: "-20%",
    width: 600,
    height: 600,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(27,77,110,0.06) 0%, transparent 70%)",
    pointerEvents: "none",
  },

  orbBottomLeft: {
    position: "fixed",
    bottom: "-20%",
    left: "-15%",
    width: 500,
    height: 500,
    borderRadius: "50%",
    background:
      "radial-gradient(circle, rgba(232,165,75,0.07) 0%, transparent 70%)",
    pointerEvents: "none",
  },

  container: {
    width: "100%",
    maxWidth: 520,
    position: "relative",
    zIndex: 1,
  },

  header: {
    textAlign: "center",
    marginBottom: 28,
    animation: "fadeDown 0.6s ease-out",
  },

  logoRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },

  logoMark: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 52,
    height: 52,
    background: "var(--primary)",
    borderRadius: 16,
    boxShadow: "0 4px 16px rgba(27,77,110,0.25)",
    flexShrink: 0,
  },

  brandName: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 20,
    color: "var(--primary)",
    letterSpacing: "-0.01em",
    lineHeight: 1.2,
  },

  headerTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 28,
    fontWeight: 400,
    color: "var(--primary)",
    lineHeight: 1.2,
    marginBottom: 8,
  },

  headerSubtitle: {
    color: "var(--text-muted)",
    fontSize: 15,
    lineHeight: 1.5,
  },

  stepLabelRow: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 8,
    padding: "0 4px",
    animation: "fadeDown 0.6s ease-out 0.1s both",
  },

  stepLabelText: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    transition: "color 0.3s",
  },

  progressBar: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
    padding: "0 4px",
    animation: "fadeDown 0.6s ease-out 0.1s both",
  },

  progressStep: {
    flex: 1,
    height: 5,
    borderRadius: 100,
    transition: "background 0.5s ease, box-shadow 0.5s ease",
  },

  card: {
    background: "var(--bg-card)",
    borderRadius: "var(--radius)",
    boxShadow: "var(--shadow)",
    padding: "36px 32px",
    position: "relative",
    overflow: "hidden",
    border: "1px solid rgba(0,0,0,0.04)",
  },

  cardTopBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    background: "linear-gradient(90deg, var(--primary), var(--accent))",
  },

  stepTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 22,
    color: "var(--primary)",
    marginBottom: 6,
  },

  stepSubtitle: {
    color: "var(--text-muted)",
    fontSize: 14,
    marginBottom: 28,
    lineHeight: 1.5,
  },

  fieldGroup: { marginBottom: 18 },

  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text)",
    marginBottom: 7,
    letterSpacing: "0.01em",
  },

  input: {
    width: "100%",
    padding: "13px 16px",
    border: "1.5px solid var(--border)",
    borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    color: "var(--text)",
    background: "var(--bg)",
    outline: "none",
    transition: "border-color 0.25s, box-shadow 0.25s, background 0.25s",
  },

  fieldError: {
    fontSize: 12,
    color: "var(--error)",
    marginTop: 5,
    display: "block",
  },

  optionGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 18,
  },

  optionCard: {
    position: "relative",
    padding: "16px 14px",
    border: "1.5px solid var(--border)",
    borderRadius: 12,
    cursor: "pointer",
    transition: "all 0.25s ease",
    textAlign: "center",
  },

  checkMark: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: "50%",
    background: "var(--primary)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  optionIcon: { fontSize: 26, marginBottom: 8, display: "block" },

  optionLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text)",
    lineHeight: 1.3,
  },

  optionList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 18,
  },

  optionItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    border: "1.5px solid var(--border)",
    borderRadius: 12,
    cursor: "pointer",
    transition: "all 0.25s ease",
  },

  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    border: "2px solid var(--border)",
    flexShrink: 0,
    transition: "all 0.25s",
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  radioDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "white",
  },

  optionText: { fontSize: 14, fontWeight: 500, color: "var(--text)" },

  selectionError: {
    fontSize: 12,
    color: "var(--error)",
    marginTop: -10,
    marginBottom: 12,
  },

  btnRow: { display: "flex", gap: 10, marginTop: 28 },

  btnPrimary: {
    flex: 1,
    padding: "14px 24px",
    borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    background: "var(--primary)",
    color: "white",
    boxShadow: "0 4px 14px rgba(27,77,110,0.3)",
    transition: "all 0.25s ease",
  },

  btnSecondary: {
    padding: "14px 20px",
    borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    background: "transparent",
    color: "var(--text-muted)",
    border: "1.5px solid var(--border)",
    transition: "all 0.25s ease",
  },

  btnSubmit: {
    flex: 1,
    padding: "14px 24px",
    borderRadius: 10,
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
    border: "none",
    background: "var(--accent)",
    color: "white",
    boxShadow: "0 4px 14px rgba(232,165,75,0.35)",
    transition: "all 0.25s ease",
  },

  successIcon: {
    width: 72,
    height: 72,
    borderRadius: "50%",
    background: "linear-gradient(135deg, var(--success), #34A065)",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    boxShadow: "0 8px 24px rgba(45,138,86,0.3)",
  },

  successTitle: {
    fontFamily: "'DM Serif Display', serif",
    fontSize: 24,
    color: "var(--primary)",
    marginBottom: 10,
  },

  successText: {
    color: "var(--text-muted)",
    fontSize: 14,
    lineHeight: 1.6,
    maxWidth: 340,
    margin: "0 auto",
  },

  trustRow: {
    display: "flex",
    justifyContent: "center",
    gap: 24,
    marginTop: 20,
    animation: "fadeDown 0.6s ease-out 0.3s both",
  },

  trustItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: "var(--text-light)",
  },
};