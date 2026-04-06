import { useState, useCallback } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────
const MERCHANTS = [
  "Amazon", "Walmart", "Netflix", "Casino Royale", "QuickCash ATM",
  "Starbucks", "Apple Store", "Unknown Vendor", "Best Buy", "Target",
  "Steam", "Uber", "Spotify", "Shell Gas", "CVS Pharmacy",
];
const COUNTRIES = ["US", "UK", "CA", "NG", "RU", "CN", "IN", "BR", "UA", "DE"];
const FRAUD_MERCHANTS = ["Casino Royale", "QuickCash ATM", "Unknown Vendor"];

const LOG_STEPS = [
  "Initializing fraud detection agent...",
  "Loading transaction dataset (120 records)...",
  "Applying rule-based scoring engine...",
  "Evaluating high-amount transactions...",
  "Checking country risk profiles...",
  "Analyzing transaction timestamps...",
  "Scanning merchant risk flags...",
  "Detecting rapid transaction sequences...",
  "Calculating precision / recall metrics...",
  "Agent run complete. Dashboard updated.",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateTransactions(count = 120) {
  return Array.from({ length: count }, (_, i) => {
    const merchant = MERCHANTS[Math.floor(Math.random() * MERCHANTS.length)];
    const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
    const hour = Math.floor(Math.random() * 24);
    const amount = Math.round(Math.random() * 2000 + 10);
    const prevTxnGap = Math.round(Math.random() * 60);
    const isTrueFraud =
      FRAUD_MERCHANTS.includes(merchant) ||
      (amount > 1500 && hour < 4) ||
      ((country === "NG" || country === "UA") && amount > 800);
    return {
      id: `TXN-${String(i + 1).padStart(4, "0")}`,
      merchant, country, hour, amount, prevTxnGap, isTrueFraud,
    };
  });
}

function scoreTransaction(txn, threshold = 50, weights = {}) {
  let score = 0;
  if (txn.amount > 1000) score += weights.highAmount ?? 35;
  if (txn.hour >= 0 && txn.hour <= 4) score += weights.oddHour ?? 25;
  if (!["US", "UK", "CA"].includes(txn.country)) score += weights.riskyCountry ?? 30;
  if (txn.prevTxnGap < 5) score += weights.rapidTxn ?? 20;
  if (FRAUD_MERCHANTS.includes(txn.merchant)) score += weights.suspiciousMerchant ?? 25;
  score = Math.min(score, 100);
  return { score, flaggedAsFraud: score >= threshold };
}

function calcMetrics(transactions) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  transactions.forEach(({ isTrueFraud, flaggedAsFraud }) => {
    if (isTrueFraud && flaggedAsFraud) tp++;
    else if (!isTrueFraud && flaggedAsFraud) fp++;
    else if (isTrueFraud && !flaggedAsFraud) fn++;
    else tn++;
  });
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const accuracy = (tp + tn) / transactions.length;
  return { precision, recall, f1, accuracy, tp, fp, fn, tn };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Gauge({ value, label, color, isDark }) {
  const pct = Math.round(value * 100);
  const r = 34, cx = 42, cy = 42, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <svg width="84" height="84" viewBox="0 0 84 84">
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={isDark ? "#1e293b" : "#e2e8f0"} strokeWidth="7" />
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth="7"
          strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dasharray 1s ease" }} />
        <text x={cx} y={cy + 5} textAnchor="middle" fontSize="13" fontWeight="600"
          fill={isDark ? "#f1f5f9" : "#0f172a"}>
          {pct}%
        </text>
      </svg>
      <span style={{
        fontSize: 11, fontWeight: 600, letterSpacing: "0.07em",
        textTransform: "uppercase", color: isDark ? "#64748b" : "#94a3b8",
      }}>
        {label}
      </span>
    </div>
  );
}

function RiskBar({ label, count, total, color, isDark }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: "monospace" }}>{count}</span>
      </div>
      <div style={{
        height: 6, borderRadius: 3,
        background: isDark ? "#1e293b" : "#e2e8f0", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${pct}%`, background: color,
          borderRadius: 3, transition: "width 1s ease",
        }} />
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, isDark }) {
  return (
    <div style={{
      background: isDark ? "#0f2040" : "#f8fafc",
      border: `1px solid ${isDark ? "#1a3a5c" : "#e2e8f0"}`,
      borderRadius: 12, padding: "16px 20px",
    }}>
      <div style={{
        fontSize: 11, color: isDark ? "#64748b" : "#94a3b8",
        marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em",
      }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color, fontFamily: "monospace" }}>
        {value}
      </div>
    </div>
  );
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────
export default function Dashboard({ theme = "dark", onThemeToggle }) {
  const isDark = theme === "dark";
  const [status, setStatus] = useState("idle");
  const [logLines, setLogLines] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [scored, setScored] = useState([]);
  const [elapsed, setElapsed] = useState(null);
  const threshold = 50;

  const bg      = isDark ? "#040d1a" : "#f0f4f8";
  const surface = isDark ? "#0a1628" : "#ffffff";
  const border  = isDark ? "#1a3a5c" : "#e2e8f0";
  const text    = isDark ? "#e2e8f0" : "#0f172a";
  const muted   = isDark ? "#64748b" : "#94a3b8";
  const blue    = "#3b82f6";
  const green   = "#10b981";
  const orange  = "#f59e0b";
  const red     = "#ef4444";
  const purple  = "#8b5cf6";

  const flaggedCount = scored.filter(t => t.flaggedAsFraud).length;
  const highRisk = scored.filter(t => t.score >= 75).length;
  const medRisk  = scored.filter(t => t.score >= 40 && t.score < 75).length;
  const lowRisk  = scored.filter(t => t.score < 40).length;

  const runAgent = useCallback(() => {
    if (status === "running") return;
    setStatus("running");
    setLogLines([]);
    setMetrics(null);
    setScored([]);
    const start = Date.now();
    const transactions = generateTransactions(120);
    let step = 0;

    const interval = setInterval(() => {
      if (step < LOG_STEPS.length) {
        setLogLines(prev => [...prev, { text: LOG_STEPS[step], index: step }]);
        step++;
      } else {
        clearInterval(interval);
        const results = transactions.map(txn => ({
          ...txn,
          ...scoreTransaction(txn, threshold),
        }));
        setScored(results);
        setMetrics(calcMetrics(results));
        setElapsed(((Date.now() - start) / 1000).toFixed(2));
        setStatus("done");
      }
    }, 280);
  }, [status]);

  return (
    <div style={{
      minHeight: "100vh", background: bg, color: text,
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      transition: "all 0.3s",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 32px", background: surface,
        borderBottom: `1px solid ${border}`,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18,
          }}>
            🛡️
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Fraud Pattern Detector</div>
            <div style={{ fontSize: 11, color: muted }}>Detection Dashboard</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {elapsed && (
            <span style={{ fontSize: 12, color: muted, fontFamily: "monospace" }}>
              Last run: {elapsed}s
            </span>
          )}
          {onThemeToggle && (
            <button onClick={onThemeToggle} style={{
              background: isDark ? "#1e293b" : "#f1f5f9",
              border: `1px solid ${border}`, borderRadius: 8,
              padding: "6px 12px", cursor: "pointer", color: text, fontSize: 13,
            }}>
              {isDark ? "☀️ Light" : "🌙 Dark"}
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>

        {/* Run Agent Panel */}
        <div style={{
          background: surface, border: `1px solid ${border}`,
          borderRadius: 16, padding: "24px", marginBottom: 20,
        }}>
          <div style={{
            display: "flex", alignItems: "flex-start",
            justifyContent: "space-between", flexWrap: "wrap", gap: 16,
          }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                Run Fraud Agent
              </div>
              <div style={{ fontSize: 13, color: muted }}>
                Scores 120 synthetic transactions using rule-based detection algorithm
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              {status === "done" && (
                <button onClick={runAgent} style={{
                  padding: "10px 18px", background: "transparent",
                  border: `1px solid ${border}`, borderRadius: 10,
                  color: text, fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}>
                  🔄 Re-run
                </button>
              )}
              <button
                onClick={runAgent}
                disabled={status === "running"}
                style={{
                  padding: "10px 24px",
                  background: status === "running"
                    ? (isDark ? "#1a3a5c" : "#bfdbfe")
                    : "linear-gradient(135deg, #2563eb, #7c3aed)",
                  border: "none", borderRadius: 10,
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: status === "running" ? "not-allowed" : "pointer",
                  opacity: status === "running" ? 0.7 : 1,
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                {status === "running" ? "⏳ Running..." : "▶ Run Agent"}
              </button>
            </div>
          </div>

          {/* Agent Log */}
          {logLines.length > 0 && (
            <div style={{
              marginTop: 18,
              background: isDark ? "#020810" : "#f8fafc",
              border: `1px solid ${border}`,
              borderRadius: 10, padding: "12px 16px",
              maxHeight: 200, overflowY: "auto",
              fontFamily: "monospace", fontSize: 12,
            }}>
              {logLines.map((line, i) => (
                <div key={i} style={{
                  padding: "3px 0",
                  color: i === logLines.length - 1
                    ? (status === "done" ? green : blue)
                    : muted,
                }}>
                  {i === logLines.length - 1 && status === "done" ? "✅" : "▸"} {line.text}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Metric Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12, marginBottom: 20,
        }}>
          <MetricCard label="Total Transactions" value={scored.length || 120} color={blue}   isDark={isDark} />
          <MetricCard label="Flagged as Fraud"   value={flaggedCount || "—"} color={red}    isDark={isDark} />
          <MetricCard label="True Positives"     value={metrics?.tp ?? "—"} color={green}  isDark={isDark} />
          <MetricCard label="False Positives"    value={metrics?.fp ?? "—"} color={orange} isDark={isDark} />
        </div>

        {/* Charts Row */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr",
          gap: 16, marginBottom: 20,
        }}>
          {/* Performance Gauges */}
          <div style={{
            background: surface, border: `1px solid ${border}`,
            borderRadius: 16, padding: "20px 24px",
          }}>
            <div style={{
              fontWeight: 700, fontSize: 13, marginBottom: 16,
              color: muted, textTransform: "uppercase", letterSpacing: "0.06em",
            }}>
              Performance Metrics
            </div>
            {metrics ? (
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: 20, justifyItems: "center",
              }}>
                <Gauge value={metrics.precision} label="Precision" color={blue}   isDark={isDark} />
                <Gauge value={metrics.recall}    label="Recall"    color={green}  isDark={isDark} />
                <Gauge value={metrics.f1}        label="F1 Score"  color={purple} isDark={isDark} />
                <Gauge value={metrics.accuracy}  label="Accuracy"  color={orange} isDark={isDark} />
              </div>
            ) : (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                height: 180, color: muted, fontSize: 13,
              }}>
                Run the agent to see metrics
              </div>
            )}
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Confusion Matrix */}
            <div style={{
              background: surface, border: `1px solid ${border}`,
              borderRadius: 16, padding: "20px 24px", flex: 1,
            }}>
              <div style={{
                fontWeight: 700, fontSize: 13, marginBottom: 14,
                color: muted, textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Confusion Matrix
              </div>
              {metrics ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    { label: "True Positive",  value: metrics.tp, color: green,  bg: isDark ? "#052e16" : "#dcfce7" },
                    { label: "False Positive", value: metrics.fp, color: orange, bg: isDark ? "#431407" : "#ffedd5" },
                    { label: "False Negative", value: metrics.fn, color: red,    bg: isDark ? "#450a0a" : "#fee2e2" },
                    { label: "True Negative",  value: metrics.tn, color: blue,   bg: isDark ? "#0c1a2e" : "#dbeafe" },
                  ].map((cell, i) => (
                    <div key={i} style={{
                      background: cell.bg, borderRadius: 10, padding: "12px 14px",
                    }}>
                      <div style={{
                        fontSize: 11, color: cell.color, fontWeight: 600,
                        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4,
                      }}>
                        {cell.label}
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 700, color: cell.color, fontFamily: "monospace" }}>
                        {cell.value}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: muted, fontSize: 13, textAlign: "center", padding: "20px 0" }}>
                  No data yet
                </div>
              )}
            </div>

            {/* Risk Distribution */}
            <div style={{
              background: surface, border: `1px solid ${border}`,
              borderRadius: 16, padding: "20px 24px", flex: 1,
            }}>
              <div style={{
                fontWeight: 700, fontSize: 13, marginBottom: 14,
                color: muted, textTransform: "uppercase", letterSpacing: "0.06em",
              }}>
                Risk Distribution
              </div>
              <RiskBar label="High Risk (score 75+)"    count={highRisk} total={scored.length || 120} color={red}    isDark={isDark} />
              <RiskBar label="Medium Risk (score 40-74)" count={medRisk}  total={scored.length || 120} color={orange} isDark={isDark} />
              <RiskBar label="Low Risk (score below 40)" count={lowRisk}  total={scored.length || 120} color={green}  isDark={isDark} />
            </div>
          </div>
        </div>

        {/* Status Bar */}
        {status === "done" && metrics && (
          <div style={{
            background: isDark ? "#052e16" : "#dcfce7",
            border: `1px solid ${isDark ? "#166534" : "#86efac"}`,
            borderRadius: 12, padding: "14px 20px",
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 13, color: green, flexWrap: "wrap",
          }}>
            ✅ Agent completed in <strong>{elapsed}s</strong> — processed{" "}
            <strong>120</strong> transactions, flagged{" "}
            <strong>{flaggedCount}</strong> as fraud with{" "}
            <strong>{Math.round(metrics.precision * 100)}%</strong> precision
            and <strong>{Math.round(metrics.recall * 100)}%</strong> recall.
          </div>
        )}
      </div>
    </div>
  );
}
