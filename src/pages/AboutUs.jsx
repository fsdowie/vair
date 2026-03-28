/* global __RELEASE_DATE__ */
import { useState, useEffect } from "react";

const INPUT_STYLE = {
  width: "100%",
  background: "rgba(10,22,40,0.7)",
  border: "1px solid rgba(76,175,80,0.3)",
  borderRadius: 8,
  color: "#e8f5e9",
  fontSize: 14,
  padding: "10px 12px",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "system-ui, -apple-system, sans-serif",
};

const LABEL_STYLE = {
  fontSize: 12,
  color: "rgba(232,245,233,0.6)",
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  marginBottom: 6,
  display: "block",
};

const REQUIRED_STAR = { color: "#ef9a9a", marginLeft: 3 };

const CLARIFYING = {
  suggestion: [
    {
      id: "area",
      label: "What area does your suggestion relate to?",
      type: "select",
      options: ["UI / Design", "Rules interpretation", "New features", "Performance", "Other"],
    },
    {
      id: "detail",
      label: "Describe your suggestion in detail",
      type: "textarea",
      placeholder: "Tell us what you have in mind…",
    },
  ],
  feedback: [
    {
      id: "rating",
      label: "Overall, how would you rate your experience?",
      type: "select",
      options: ["⭐ 1 – Poor", "⭐⭐ 2 – Fair", "⭐⭐⭐ 3 – Good", "⭐⭐⭐⭐ 4 – Very good", "⭐⭐⭐⭐⭐ 5 – Excellent"],
    },
    {
      id: "detail",
      label: "What did you like or dislike?",
      type: "textarea",
      placeholder: "Share your thoughts…",
    },
  ],
  wrong_reply: [
    {
      id: "question_asked",
      label: "What question did you ask VAIR?",
      type: "textarea",
      placeholder: "Paste or describe the question…",
    },
    {
      id: "vair_answer",
      label: "What answer did VAIR give?",
      type: "textarea",
      placeholder: "Paste VAIR's response…",
    },
    {
      id: "correct_answer",
      label: "What do you believe the correct answer should be?",
      type: "textarea",
      placeholder: "Explain the correct ruling…",
    },
    {
      id: "law_reference",
      label: "Which Law of the Game is relevant? (optional)",
      type: "text",
      placeholder: "e.g. Law 12 – Fouls and Misconduct",
    },
  ],
};

function genMath() {
  const a = Math.floor(Math.random() * 9) + 1;
  const b = Math.floor(Math.random() * 9) + 1;
  return { a, b, answer: a + b };
}

function Field({ label, required, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <label style={LABEL_STYLE}>
        {label}{required && <span style={REQUIRED_STAR}>*</span>}
      </label>
      {children}
    </div>
  );
}

function FeedbackModal({ onClose }) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", type: "", clarifying: {},
  });
  const [captcha, setCaptcha] = useState({ ...genMath(), input: "" });
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error

  // Reset captcha on mount
  useEffect(() => { setCaptcha({ ...genMath(), input: "" }); }, []);

  const set = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  const setClarifying = (id, value) => {
    setForm(f => ({ ...f, clarifying: { ...f.clarifying, [id]: value } }));
    setErrors(e => ({ ...e, [id]: undefined }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.phone.trim()) e.phone = "Phone number is required";
    if (!form.type) e.type = "Please select a type";
    if (form.type) {
      (CLARIFYING[form.type] || []).forEach(q => {
        if (q.id !== "law_reference" && !form.clarifying[q.id]?.trim())
          e[q.id] = "This field is required";
      });
    }
    if (!captcha.input.trim()) e.captcha = "Please solve the captcha";
    else if (parseInt(captcha.input, 10) !== captcha.answer) e.captcha = "Incorrect answer";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setStatus("submitting");

    const typeLabel = {
      suggestion: "Suggestion",
      feedback: "General Feedback",
      wrong_reply: "Wrong VAIR Reply",
    }[form.type];

    const clarifyingText = (CLARIFYING[form.type] || [])
      .map(q => `${q.label}\n${form.clarifying[q.id] || "N/A"}`)
      .join("\n\n");

    const body = {
      access_key: import.meta.env.VITE_WEB3FORMS_KEY,
      subject: `[VAIR Feedback] ${typeLabel} from ${form.name}`,
      from_name: form.name,
      email: form.email,
      phone: form.phone,
      type: typeLabel,
      details: clarifyingText,
    };

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) setStatus("success");
      else throw new Error(data.message);
    } catch {
      setStatus("error");
    }
  };

  const errorStyle = { fontSize: 11, color: "#ef9a9a", marginTop: 4 };

  if (status === "success") {
    return (
      <ModalShell onClose={onClose}>
        <div style={{ textAlign: "center", padding: "32px 0" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
          <h3 style={{ fontSize: 20, fontWeight: 700, color: "#81c784", marginBottom: 8 }}>
            Thanks for your message!
          </h3>
          <p style={{ color: "rgba(232,245,233,0.6)", fontSize: 14 }}>
            We'll review it and get back to you if needed.
          </p>
          <button onClick={onClose} style={{ ...btnStyle, marginTop: 24 }}>Close</button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose}>
      <h3 style={{
        fontSize: 18, fontWeight: 700,
        background: "linear-gradient(135deg, #4caf50, #81c784)",
        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        marginBottom: 24,
      }}>
        Send us a message
      </h3>

      <form onSubmit={handleSubmit} noValidate style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Name */}
        <Field label="Full name" required>
          <input style={INPUT_STYLE} value={form.name} onChange={e => set("name", e.target.value)} placeholder="Your name" />
          {errors.name && <span style={errorStyle}>{errors.name}</span>}
        </Field>

        {/* Email */}
        <Field label="Email" required>
          <input style={INPUT_STYLE} type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="your@email.com" />
          {errors.email && <span style={errorStyle}>{errors.email}</span>}
        </Field>

        {/* Phone */}
        <Field label="Phone number" required>
          <input style={INPUT_STYLE} type="tel" value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+1 555 000 0000" />
          {errors.phone && <span style={errorStyle}>{errors.phone}</span>}
        </Field>

        {/* Type dropdown */}
        <Field label="Type of message" required>
          <select
            style={INPUT_STYLE}
            value={form.type}
            onChange={e => { set("type", e.target.value); setForm(f => ({ ...f, clarifying: {} })); }}
          >
            <option value="">— Select one —</option>
            <option value="suggestion">Suggestion</option>
            <option value="feedback">General feedback</option>
            <option value="wrong_reply">I found a wrong VAIR reply</option>
          </select>
          {errors.type && <span style={errorStyle}>{errors.type}</span>}
        </Field>

        {/* Clarifying questions */}
        {form.type && (CLARIFYING[form.type] || []).map(q => (
          <Field key={q.id} label={q.label} required={q.id !== "law_reference"}>
            {q.type === "textarea" ? (
              <textarea
                style={{ ...INPUT_STYLE, minHeight: 80, resize: "vertical" }}
                value={form.clarifying[q.id] || ""}
                onChange={e => setClarifying(q.id, e.target.value)}
                placeholder={q.placeholder}
              />
            ) : q.type === "select" ? (
              <select
                style={INPUT_STYLE}
                value={form.clarifying[q.id] || ""}
                onChange={e => setClarifying(q.id, e.target.value)}
              >
                <option value="">— Select —</option>
                {q.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                style={INPUT_STYLE}
                value={form.clarifying[q.id] || ""}
                onChange={e => setClarifying(q.id, e.target.value)}
                placeholder={q.placeholder}
              />
            )}
            {errors[q.id] && <span style={errorStyle}>{errors[q.id]}</span>}
          </Field>
        ))}

        {/* Captcha */}
        <Field label={`What is ${captcha.a} + ${captcha.b}?`} required>
          <input
            style={{ ...INPUT_STYLE, maxWidth: 120 }}
            type="number"
            value={captcha.input}
            onChange={e => {
              setCaptcha(c => ({ ...c, input: e.target.value }));
              setErrors(err => ({ ...err, captcha: undefined }));
            }}
            placeholder="Answer"
          />
          {errors.captcha && <span style={errorStyle}>{errors.captcha}</span>}
        </Field>

        {status === "error" && (
          <p style={{ fontSize: 13, color: "#ef9a9a", background: "rgba(239,154,154,0.1)", borderRadius: 8, padding: "10px 14px" }}>
            Something went wrong. Please try again or email us directly at fsdowie@gmail.com
          </p>
        )}

        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
          <button type="button" onClick={onClose} style={{ ...btnStyle, background: "rgba(255,255,255,0.06)" }}>
            Cancel
          </button>
          <button type="submit" disabled={status === "submitting"} style={{ ...btnStyle, opacity: status === "submitting" ? 0.6 : 1 }}>
            {status === "submitting" ? "Sending…" : "Send message"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function ModalShell({ onClose, children }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#0d2137",
          border: "1px solid rgba(76,175,80,0.25)",
          borderRadius: 16,
          padding: "32px 28px",
          width: "100%",
          maxWidth: 520,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

const btnStyle = {
  background: "linear-gradient(135deg, #2e7d32, #4caf50)",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  padding: "10px 20px",
  cursor: "pointer",
};

export default function AboutUs() {
  const [showForm, setShowForm] = useState(false);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a1628, #0d2137)",
      color: "#e8f5e9",
      fontFamily: "system-ui, -apple-system, sans-serif",
    }}>
      {/* Header */}
      <div style={{
        padding: "24px 32px 16px",
        borderBottom: "1px solid rgba(76,175,80,0.2)",
        background: "rgba(10,22,40,0.95)",
      }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 700,
          background: "linear-gradient(135deg, #4caf50, #81c784)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginBottom: 4,
        }}>
          ℹ️ About Us
        </h1>
        <p style={{ fontSize: 13, color: "rgba(232,245,233,0.6)" }}>
          Project information
        </p>
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}>
        <div style={{
          background: "rgba(13,33,55,0.6)",
          border: "1px solid rgba(76,175,80,0.2)",
          borderRadius: 16,
          padding: "40px 56px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
          minWidth: 320,
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 12 }}>🟢</div>
            <h2 style={{
              fontSize: 28,
              fontWeight: 700,
              background: "linear-gradient(135deg, #4caf50, #81c784)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              VAIR
            </h2>
            <p style={{ fontSize: 13, color: "rgba(232,245,233,0.5)", marginTop: 4 }}>
              Video Assistant Intelligence Referee
            </p>
          </div>

          <div style={{ borderTop: "1px solid rgba(76,175,80,0.15)", paddingTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 32 }}>
              <span style={{ fontSize: 13, color: "rgba(232,245,233,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Author</span>
              <span style={{ fontSize: 15, fontWeight: 600, color: "#e8f5e9" }}>Federico</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 32 }}>
              <span style={{ fontSize: 13, color: "rgba(232,245,233,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Release</span>
              <span style={{ fontSize: 14, fontFamily: "monospace", color: "#81c784" }}>
                {typeof __RELEASE_DATE__ !== 'undefined' ? __RELEASE_DATE__ : 'unknown'}
              </span>
            </div>
          </div>

          {/* Feedback button */}
          <div style={{ borderTop: "1px solid rgba(76,175,80,0.15)", paddingTop: 24, textAlign: "center" }}>
            <button
              onClick={() => setShowForm(true)}
              style={{
                ...btnStyle,
                fontSize: 15,
                padding: "12px 28px",
                boxShadow: "0 4px 16px rgba(76,175,80,0.2)",
              }}
            >
              💬 Send Feedback
            </button>
          </div>
        </div>
      </div>

      {showForm && <FeedbackModal onClose={() => setShowForm(false)} />}
    </div>
  );
}
