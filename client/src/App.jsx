import React, { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import { childApi, getError, questionApi } from "./api.js";

const ages = ["3-5", "6-8", "9-12"];

const Page = ({ children }) => <div className="app-shell">{children}</div>;

const Card = ({ title, children, actions }) => (
  <div className="card">
    <div className="card-header">
      <h3 className="card-title">{title}</h3>
      <div className="card-actions">{actions}</div>
    </div>
    {children}
  </div>
);

const Input = ({ className = "", ...props }) => <input {...props} className={`input ${className}`} />;
const Select = ({ className = "", ...props }) => <select {...props} className={`select ${className}`} />;

const Button = ({ children, tone = "primary", className = "", ...props }) => {
  const toneClass =
    tone === "ghost" ? "button-ghost" : tone === "danger" ? "button-danger" : "button-primary";
  return (
    <button {...props} className={`button ${toneClass} ${className}`}>
      {children}
    </button>
  );
};

const Nav = () => {
  const { pathname } = useLocation();
  return (
    <div className="nav">
      <a href="/ask" className={pathname === "/ask" ? "active" : ""}>Ask</a>
      <a href="/children" className={pathname === "/children" ? "active" : ""}>Children</a>
      <a href="/" className={pathname === "/" ? "active" : ""}>Home</a>
    </div>
  );
};

const Shell = ({ children }) => {
  const { user, logout } = useAuth();
  return (
    <Page>
      <div className="shell-header">
        <div className="brand">
          <div className="brand-badge">AI</div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800 }}>AI Parenting Helper</div>
            <div className="muted">Age-smart answers, stories, and activities—safe by design.</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Nav />
          <div className="muted" style={{ fontWeight: 600 }}>{user?.email}</div>
          <Button tone="ghost" onClick={logout}>Logout</Button>
        </div>
      </div>
      {children}
    </Page>
  );
};

const AuthForm = ({ mode }) => {
  const { login, signup, loading, error } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "", name: "" });

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (mode === "signup") {
        await signup(form);
      } else {
        await login(form);
      }
      navigate("/ask");
    } catch {
      /* handled in context */
    }
  };

  return (
    <Page>
      <div style={{ maxWidth: 460, margin: "80px auto" }}>
        <Card title={mode === "signup" ? "Create account" : "Log in"}>
          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {mode === "signup" && (
              <div>
                <label style={{ fontSize: 13, fontWeight: 600 }}>Name</label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Parent name" />
              </div>
            )}
            <div>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Email</label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Password</label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" required />
            </div>
            {error && <div style={{ color: "#fca5a5", fontSize: 13 }}>{error}</div>}
            <Button type="submit" disabled={loading}>{loading ? "..." : mode === "signup" ? "Sign up" : "Log in"}</Button>
            <div style={{ fontSize: 13 }}>
              {mode === "signup" ? (
                <>Already have an account? <a href="/login">Log in</a></>
              ) : (
                <>No account? <a href="/signup">Create one</a></>
              )}
            </div>
          </form>
        </Card>
      </div>
    </Page>
  );
};

const AskPanel = ({ childrenList, onAsked }) => {
  const [question, setQuestion] = useState("");
  const [childId, setChildId] = useState("");
  const [ageGroup, setAgeGroup] = useState("6-8");
  const [childEmotion, setChildEmotion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (childrenList.length && !childId) {
      setChildId(childrenList[0]._id);
    }
  }, [childrenList, childId]);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!question.trim()) {
      setError("Please enter a question");
      return;
    }
    setLoading(true);
    try {
      const payload = { question: question.trim(), childEmotion };
      if (childId) payload.childId = childId;
      else payload.ageGroup = ageGroup;
      const res = await questionApi.ask(payload);
      onAsked(res);
    } catch (err) {
      setError(getError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Ask a question">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          placeholder="Type your child's question..."
          className="textarea"
        />
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Child</label>
            <Select value={childId} onChange={(e) => setChildId(e.target.value)}>
              {childrenList.length === 0 && <option value="">No child profiles</option>}
              {childrenList.map((c) => (
                <option key={c._id} value={c._id}>{c.name} ({c.ageGroup})</option>
              ))}
              <option value="">Use manual age</option>
            </Select>
          </div>
          {!childId && (
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={{ fontSize: 13, fontWeight: 600 }}>Age group</label>
              <Select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)}>
                {ages.map((a) => <option key={a}>{a}</option>)}
              </Select>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 13, fontWeight: 600 }}>Emotion (optional)</label>
            <Input value={childEmotion} onChange={(e) => setChildEmotion(e.target.value)} placeholder="e.g. anxious, curious" />
          </div>
        </div>
        {error && <div style={{ color: "#fca5a5", fontSize: 13 }}>{error}</div>}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="submit" disabled={loading}>{loading ? "Thinking..." : "Ask"}</Button>
        </div>
      </form>
    </Card>
  );
};

const ChildManager = ({ childrenList, onChange }) => {
  const [form, setForm] = useState({ name: "", ageGroup: "6-8", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addChild = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await childApi.create(form);
      setForm({ name: "", ageGroup: "6-8", notes: "" });
      onChange();
    } catch (err) {
      setError(getError(err));
    } finally {
      setSaving(false);
    }
  };

  const removeChild = async (id) => {
    if (!confirm("Remove this child profile?")) return;
    try {
      await childApi.remove(id);
      onChange();
    } catch (err) {
      alert(getError(err));
    }
  };

  return (
    <Card title="Child profiles">
      <form onSubmit={addChild} style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name" style={{ flex: 2, minWidth: 150 }} required />
        <Select value={form.ageGroup} onChange={(e) => setForm({ ...form, ageGroup: e.target.value })} style={{ flex: 1, minWidth: 140 }}>
          {ages.map((a) => <option key={a}>{a}</option>)}
        </Select>
        <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" style={{ flex: 3, minWidth: 180 }} />
        <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Add"}</Button>
      </form>
      {error && <div style={{ color: "#fca5a5", fontSize: 13, marginBottom: 8 }}>{error}</div>}
      {childrenList.length === 0 ? (
        <div className="empty">No child profiles yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {childrenList.map((c) => (
            <div key={c._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, border: "1px solid var(--border)", borderRadius: 8 }}>
              <div>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div className="muted">Age group: {c.ageGroup}{c.notes ? ` · ${c.notes}` : ""}</div>
              </div>
              <Button tone="danger" onClick={() => removeChild(c._id)}>Remove</Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

const ResponseView = ({ data, onFeedback }) => {
  if (!data) return null;
  const { answer, analysis, story, activities, parentTips, safety } = data;
  return (
    <Card
      title="Response"
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <Button tone="ghost" onClick={() => onFeedback("up")}>Helpful</Button>
          <Button tone="ghost" onClick={() => onFeedback("down")}>Needs work</Button>
        </div>
      }
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
        <div style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 10 }}>
          <div className="section-title">Answer</div>
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>{answer}</div>
          {safety && (
            <div style={{ marginTop: 8 }}>
              <span className={safety.flag === "safe" ? "badge-safe" : "badge-unsafe"}>
                Safety: {safety.flag}
              </span>
            </div>
          )}
        </div>
        <div style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 10 }}>
          <div className="section-title">Story / Analogy</div>
          <div style={{ fontSize: 14, lineHeight: 1.6 }}>{story}</div>
        </div>
        <div style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 10 }}>
          <div className="section-title">Activities</div>
          <ul className="list">
            {activities?.map((a, i) => <li key={i}>{a}</li>)}
          </ul>
        </div>
        <div style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 10 }}>
          <div className="section-title">Parent tips</div>
          <ul className="list">
            {parentTips?.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
        <div style={{ padding: 10, border: "1px solid var(--border)", borderRadius: 10 }}>
          <div className="section-title">Analysis</div>
          <div style={{ fontSize: 14, color: "var(--muted)" }}>
            <div>Topic: {analysis?.topic || "-"}</div>
            <div>Intent: {analysis?.intent || "-"}</div>
            <div>Age: {analysis?.age_level || "-"}</div>
            <div>Emotion: {analysis?.emotion || "-"}</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const HistoryList = ({ items, onSelect, onRefresh, loading }) => (
  <Card
    title="History"
    actions={<Button tone="ghost" onClick={onRefresh} disabled={loading}>{loading ? "..." : "Refresh"}</Button>}
  >
    {items.length === 0 ? (
      <div className="empty">No history yet.</div>
    ) : (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((it) => (
          <div
            key={it._id || it.id}
            onClick={() => onSelect(it)}
            className="history-item"
          >
            <div style={{ fontWeight: 700 }}>{it.question}</div>
            <div className="muted" style={{ fontSize: 12 }}>Age: {it.ageGroup} · {new Date(it.createdAt).toLocaleString()}</div>
            <div style={{ fontSize: 13, color: "#cbd5f5", marginTop: 4 }}>{(it.answer || it.finalAnswer || "").slice(0, 110)}...</div>
          </div>
        ))}
      </div>
    )}
  </Card>
);

const Home = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const highlights = [
    { title: "Age-adapted answers", desc: "3-5, 6-8, 9-12 vocabulary and tone." },
    { title: "Stories & activities", desc: "Keep kids engaged with analogies and hands-on ideas." },
    { title: "Parent guidance", desc: "Follow-up prompts and calm conversation tips." },
    { title: "Safety-first", desc: "Automatic safety check and rewrite before you see it." }
  ];
  const steps = [
    "Pick your child profile (or set age group).",
    "Type the child’s question and emotion (optional).",
    "Get answer + story + activities, pre-checked for safety.",
    "Share with confidence; save feedback for tuning."
  ];
  const modules = [
    "Question understanding: topic, intent, age fit.",
    "Age-based explanation generator.",
    "Parent guidance: tone and follow-ups.",
    "Story/analogy builder.",
    "Activity suggester.",
    "Safety & rewrite filter."
  ];
  return (
    <Page>
      <div className="grid" style={{ gap: 18, marginTop: 28 }}>
        <div className="card">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 18, alignItems: "center" }}>
            <div>
              <div className="pill" style={{ marginBottom: 12 }}>Child-safe AI · Stories · Activities</div>
              <h1 style={{ margin: "0 0 10px", fontSize: 34 }}>Answer any question like a calm, caring parent.</h1>
              <p className="muted" style={{ fontSize: 15, lineHeight: 1.6 }}>
                AI Parenting Helper classifies the topic and intent, adapts to your child’s age, writes gentle answers,
                turns them into stories and activities, and runs a safety check before you see it.
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
                <Button onClick={() => navigate(user ? "/ask" : "/login")}>Start asking</Button>
                <Button tone="ghost" onClick={() => navigate("/children")}>Set up child profiles</Button>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
                <span className="pill-ghost">Age-smart answers</span>
                <span className="pill-ghost">Stories & activities</span>
                <span className="pill-ghost">Safety checked</span>
              </div>
            </div>
            <div>
              <div className="section-title">Highlights</div>
              <div className="section-grid">
                {highlights.map((h) => (
                  <div key={h.title} className="feature-card">
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{h.title}</div>
                    <div className="muted" style={{ fontSize: 13 }}>{h.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="section">
          <div className="section-title">How it works</div>
          <div className="section-grid">
            {steps.map((s, i) => (
              <div key={i} className="step">
                <div className="pill-ghost">Step {i + 1}</div>
                <div style={{ marginTop: 6, color: "#e5ecff" }}>{s}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="section-title">Six core modules</div>
          <div className="section-grid">
            {modules.map((m, i) => (
              <div key={i} className="feature-card">
                <div className="pill-ghost">Module {i + 1}</div>
                <div style={{ marginTop: 6, fontWeight: 700 }}>{m}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="section-title">Safety-first</div>
          <div className="section-grid">
            {[
              "Filters out scary or harmful phrasing and rewrites if needed.",
              "Keeps tone bias-free, age-safe, and emotionally gentle.",
              "Flags safety status on every answer so you stay in control."
            ].map((item, i) => (
              <div key={i} className="stat-card">
                <div className="stat-label" style={{ marginBottom: 4 }}>Guardrail</div>
                <div style={{ color: "#e5ecff" }}>{item}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="card" style={{ textAlign: "center" }}>
            <h2 style={{ margin: "0 0 8px" }}>Ready to guide every question with confidence?</h2>
            <p className="muted" style={{ margin: "0 0 16px" }}>
              Set up your children once, then ask anything—answers, stories, activities, and safety checks included.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Button onClick={() => navigate(user ? "/ask" : "/login")}>Start now</Button>
              <Button tone="ghost" onClick={() => navigate("/children")}>Build child profiles</Button>
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
};

const ChildrenPage = () => {
  const [children, setChildren] = useState([]);
  const loadChildren = async () => {
    try {
      const res = await childApi.list();
      setChildren(res);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadChildren();
  }, []);

  return (
    <Shell>
      <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 16 }}>
        <ChildManager childrenList={children} onChange={loadChildren} />
      </div>
    </Shell>
  );
};

const AskPage = () => {
  const [children, setChildren] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [response, setResponse] = useState(null);

  const loadChildren = async () => {
    try {
      const res = await childApi.list();
      setChildren(res);
    } catch (err) {
      console.error(err);
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await questionApi.history({ page: 1, limit: 20 });
      setHistory(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadChildren();
    loadHistory();
  }, []);

  const sendFeedback = async (vote) => {
    if (!response?.id && !response?._id) return;
    const id = response.id || response._id;
    try {
      await questionApi.feedback(id, { helpful: vote === "up", rating: vote === "up" ? 5 : 2 });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Shell>
      <div className="grid grid-2col">
        <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 16 }}>
          <AskPanel childrenList={children} onAsked={(res) => { setResponse(res); loadHistory(); }} />
          <ResponseView data={response} onFeedback={sendFeedback} />
        </div>
        <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 16 }}>
          <ChildManager childrenList={children} onChange={loadChildren} />
          <HistoryList items={history} onSelect={(item) => setResponse(item)} onRefresh={loadHistory} loading={historyLoading} />
        </div>
      </div>
    </Shell>
  );
};

const PrivateRoute = ({ children }) => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthForm mode="login" />} />
          <Route path="/signup" element={<AuthForm mode="signup" />} />
          <Route path="/" element={<Home />} />
          <Route
            path="/ask"
            element={
              <PrivateRoute>
                <AskPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/children"
            element={
              <PrivateRoute>
                <ChildrenPage />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
