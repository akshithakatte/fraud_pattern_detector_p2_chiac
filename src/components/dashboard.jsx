import { useState } from "react";

// ─── Gauge Component ────────────────────────────────────────────────────────
function Gauge({ value, label, color }) {
  const pct = Math.round(value * 100);
  const r = 36, cx = 44, cy = 44;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={88} height={88} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e293b" strokeWidth={8} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div style={{ marginTop: -60, fontSize: 18, fontWeight: 800, color, fontFamily: "monospace" }}>{pct}%</div>
      <div style={{ marginTop: 36, fontSize: 11, color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

// ─── Transaction Timeline ───────────────────────────────────────────────────
function TransactionTimeline({ transactions, darkMode }) {
  const processedTxns = transactions
    .filter(t => t.status === "done")
    .sort((a, b) => a.timestamp - b.timestamp);

  if (processedTxns.length === 0) return null;

  const maxCircles = 80;
  const displayTxns = processedTxns.length > maxCircles
    ? processedTxns.slice(-maxCircles)
    : processedTxns;

  return (
    <div style={{
      background: darkMode ? "#0f172a" : "#f1f5f9",
      border: "1px solid #1e293b", borderRadius: 12, padding: 24,
    }}>
      <div style={{ fontSize: 11, color: darkMode ? "#475569" : "#64748b", letterSpacing: "0.1em", marginBottom: 20 }}>
        TRANSACTION FLEET TIMELINE
      </div>
      <div style={{
        display: "flex", alignItems: "center", flexWrap: "wrap",
        gap: 4, position: "relative", minHeight: 30,
      }}>
        {displayTxns.map((txn) => (
          <div key={txn.id} style={{
            width: 14, height: 14, borderRadius: "50%",
            background: txn.flaggedAsFraud ? "#f87171" : "#34d399",
            opacity: txn.flaggedAsFraud ? 1 : 0.7,
            border: txn.isActualFraud ? "2px solid #fbbf24" : "none",
            cursor: "pointer", flexShrink: 0,
          }}
            title={`${txn.id} - ${txn.merchant} - $${txn.amount.toFixed(2)} - ${txn.flaggedAsFraud ? "FRAUD" : "CLEAR"}`}
          />
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 16 }}>
        {[
          { color: "#34d399", opacity: 0.7, border: "none", label: "Clear Transaction" },
          { color: "#f87171", opacity: 1,   border: "none", label: "Flagged Fraud" },
          { color: "#34d399", opacity: 0.7, border: "2px solid #fbbf24", label: "Actual Fraud (border)" },
        ].map(({ color, opacity, border, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: darkMode ? "#94a3b8" : "#64748b" }}>
            <div style={{ width: 12, height: 12, background: color, borderRadius: "50%", opacity, border }} />
            {label}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 12, fontSize: 10, color: darkMode ? "#64748b" : "#475569" }}>
        <span>Total: {processedTxns.length}</span>
        <span>Showing: {displayTxns.length}</span>
        <span>Fraud: {processedTxns.filter(t => t.flaggedAsFraud).length}</span>
        <span>Actual Fraud: {processedTxns.filter(t => t.isActualFraud).length}</span>
      </div>
    </div>
  );
}

// ─── Fraud Alerts Ticker ────────────────────────────────────────────────────
function FraudAlertsTicker({ transactions, darkMode }) {
  const [currentPage, setCurrentPage] = useState(0);
  const processedTxns = transactions.filter(t => t.status === "done" && t.flaggedAsFraud);

  if (processedTxns.length === 0) return null;

  const alertsPerPage = 5;
  const totalPages = Math.ceil(processedTxns.length / alertsPerPage);
  const startIndex = (totalPages - 1 - currentPage) * alertsPerPage;
  const currentAlerts = processedTxns.slice(startIndex, startIndex + alertsPerPage).reverse();

  return (
    <div style={{
      background: darkMode ? "#0f172a" : "#f1f5f9",
      border: "1px solid #1e293b", borderRadius: 12, padding: 20,
    }}>
      <div style={{ fontSize: 11, color: darkMode ? "#475569" : "#64748b", letterSpacing: "0.1em", marginBottom: 16 }}>
        🚨 LIVE FRAUD ALERTS
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {currentAlerts.map((alert) => (
          <div key={alert.id} style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px",
            background: darkMode ? "#7f1d1d22" : "#fef2f2",
            border: `1px solid ${darkMode ? "#f8717133" : "#f8717166"}`,
            borderRadius: 8, borderLeft: "4px solid #f87171",
          }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#f87171", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: darkMode ? "#f87171" : "#dc2626", marginBottom: 2 }}>
                {alert.id} - {alert.merchant}
              </div>
              <div style={{ fontSize: 11, color: darkMode ? "#94a3b8" : "#475569" }}>
                ${alert.amount.toFixed(2)} • {alert.country} • Score: {alert.score}
              </div>
              {alert.reasons.length > 0 && (
                <div style={{ fontSize: 10, color: darkMode ? "#64748b" : "#64748b", marginTop: 4 }}>
                  ⚠ {alert.reasons.join(", ")}
                </div>
              )}
            </div>
            <div style={{
              fontSize: 10, padding: "4px 8px",
              background: darkMode ? "#7f1d1d" : "#dc2626",
              color: "#fff", borderRadius: 4, fontWeight: 600,
            }}>
              FRAUD
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 14, padding: "10px 14px",
          background: darkMode ? "#1e293b" : "#f8fafc", borderRadius: 8,
        }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            style={{
              padding: "6px 12px", borderRadius: 6, fontSize: 11,
              background: darkMode ? "#334155" : "#e2e8f0",
              border: `1px solid ${darkMode ? "#475569" : "#cbd5e1"}`,
              color: darkMode ? "#e2e8f0" : "#475569",
              cursor: currentPage === 0 ? "not-allowed" : "pointer",
              opacity: currentPage === 0 ? 0.5 : 1,
            }}>
            ← Previous {alertsPerPage}
          </button>
          <div style={{ fontSize: 11, color: darkMode ? "#94a3b8" : "#475569" }}>
            Page {currentPage + 1} of {totalPages} • {processedTxns.length} total alerts
          </div>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
            style={{
              padding: "6px 12px", borderRadius: 6, fontSize: 11,
              background: darkMode ? "#334155" : "#e2e8f0",
              border: `1px solid ${darkMode ? "#475569" : "#cbd5e1"}`,
              color: darkMode ? "#e2e8f0" : "#475569",
              cursor: currentPage === totalPages - 1 ? "not-allowed" : "pointer",
              opacity: currentPage === totalPages - 1 ? 0.5 : 1,
            }}>
            Next {alertsPerPage} →
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Merchant Analysis ──────────────────────────────────────────────────────
function MerchantAnalysis({ transactions, darkMode }) {
  const processedTxns = transactions.filter(t => t.status === "done");
  if (processedTxns.length === 0) return null;

  const merchantData = {};
  processedTxns.forEach(txn => {
    if (!merchantData[txn.merchant]) {
      merchantData[txn.merchant] = { total: 0, fraud: 0, actualFraud: 0, totalAmount: 0 };
    }
    merchantData[txn.merchant].total++;
    merchantData[txn.merchant].totalAmount += txn.amount;
    if (txn.flaggedAsFraud) merchantData[txn.merchant].fraud++;
    if (txn.isActualFraud) merchantData[txn.merchant].actualFraud++;
  });

  const sortedMerchants = Object.entries(merchantData)
    .map(([merchant, data]) => ({
      merchant, ...data,
      fraudRate: (data.fraud / data.total) * 100,
      avgAmount: data.totalAmount / data.total,
    }))
    .sort((a, b) => b.fraudRate - a.fraudRate);

  return (
    <div style={{
      background: darkMode ? "#0f172a" : "#f1f5f9",
      border: "1px solid #1e293b", borderRadius: 12, padding: 24,
    }}>
      <div style={{ fontSize: 11, color: darkMode ? "#475569" : "#64748b", letterSpacing: "0.1em", marginBottom: 20 }}>
        MERCHANT ANALYSIS
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        {sortedMerchants.map(({ merchant, total, fraud, actualFraud, fraudRate, avgAmount, totalAmount }) => {
          const isHighRisk = fraudRate > 30;
          const barColor = isHighRisk ? "#f87171" : fraudRate > 15 ? "#fb923c" : "#34d399";
          return (
            <div key={merchant} style={{
              background: darkMode ? "#1e293b" : "#fff",
              border: `1px solid ${isHighRisk ? "#f8717133" : darkMode ? "#334155" : "#e2e8f0"}`,
              borderRadius: 8, padding: 16,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: darkMode ? "#e2e8f0" : "#1e293b" }}>{merchant}</div>
                <div style={{
                  fontSize: 10, padding: "2px 6px", borderRadius: 4,
                  background: isHighRisk ? "#7f1d1d" : fraudRate > 15 ? "#78350f" : "#14532d",
                  color: isHighRisk ? "#f87171" : fraudRate > 15 ? "#fb923c" : "#34d399",
                }}>
                  {fraudRate.toFixed(1)}% fraud
                </div>
              </div>
              <div style={{ height: 6, background: darkMode ? "#0f172a" : "#f1f5f9", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
                <div style={{ height: "100%", width: `${Math.min(fraudRate, 100)}%`, background: barColor, borderRadius: 3, transition: "width 0.3s" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                {[
                  { label: "Transactions", value: total,                          color: darkMode ? "#e2e8f0" : "#1e293b" },
                  { label: "Flagged Fraud", value: fraud,                         color: "#f87171" },
                  { label: "Avg Amount",    value: `$${avgAmount.toFixed(0)}`,    color: darkMode ? "#e2e8f0" : "#1e293b" },
                  { label: "Total Volume",  value: `$${totalAmount.toFixed(0)}`,  color: darkMode ? "#e2e8f0" : "#1e293b" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <div style={{ color: darkMode ? "#64748b" : "#475569" }}>{label}</div>
                    <div style={{ fontWeight: 600, color }}>{value}</div>
                  </div>
                ))}
              </div>
              {actualFraud > 0 && (
                <div style={{ marginTop: 8, fontSize: 10, color: darkMode ? "#fbbf24" : "#f59e0b" }}>
                  ⚠ {actualFraud} actual fraud case{actualFraud > 1 ? "s" : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{
        marginTop: 16, padding: 12,
        background: darkMode ? "#1e293b" : "#f8fafc",
        borderRadius: 8, fontSize: 11, color: darkMode ? "#94a3b8" : "#475569",
      }}>
        <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
          {[
            { label: "Unique Merchants",    value: sortedMerchants.length,                                          color: darkMode ? "#e2e8f0" : "#1e293b" },
            { label: "High Risk (>30%)",    value: sortedMerchants.filter(m => m.fraudRate > 30).length,            color: "#f87171" },
            { label: "Medium Risk (15-30%)", value: sortedMerchants.filter(m => m.fraudRate > 15 && m.fraudRate <= 30).length, color: "#fb923c" },
            { label: "Low Risk (≤15%)",     value: sortedMerchants.filter(m => m.fraudRate <= 15).length,           color: "#34d399" },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div style={{ fontWeight: 600, color }}>{value}</div>
              <div>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Component ───────────────────────────────────────────────
export default function Dashboard({ transactions, metrics, darkMode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>

      <TransactionTimeline transactions={transactions} darkMode={darkMode} />

      <FraudAlertsTicker transactions={transactions} darkMode={darkMode} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

        {/* Gauges */}
        <div style={{
          background: darkMode ? "#0f172a" : "#f1f5f9",
          border: "1px solid #1e293b", borderRadius: 12, padding: 24,
        }}>
          <div style={{ fontSize: 11, color: darkMode ? "#475569" : "#64748b", letterSpacing: "0.1em", marginBottom: 24 }}>
            PRECISION / RECALL / F1 / ACCURACY
          </div>
          {metrics ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-around" }}>
                <Gauge value={metrics.precision} label="Precision" color="#6366f1" />
                <Gauge value={metrics.recall}    label="Recall"    color="#22d3ee" />
                <Gauge value={metrics.f1}        label="F1 Score"  color="#f59e0b" />
                <Gauge value={metrics.accuracy}  label="Accuracy"  color="#34d399" />
              </div>
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                gap: 12, marginTop: 28, paddingTop: 20, borderTop: "1px solid #1e293b",
              }}>
                {[
                  { l: "True Positives",  v: metrics.tp, c: "#34d399" },
                  { l: "False Positives", v: metrics.fp, c: "#f87171" },
                  { l: "False Negatives", v: metrics.fn, c: "#fb923c" },
                  { l: "True Negatives",  v: metrics.tn, c: "#818cf8" },
                ].map(m => (
                  <div key={m.l} style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: m.c }}>{m.v}</div>
                    <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{m.l}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: darkMode ? "#334155" : "#94a3b8", textAlign: "center", paddingTop: 40 }}>
              Run agent to see metrics
            </div>
          )}
        </div>

        {/* Confusion Matrix */}
        <div style={{
          background: darkMode ? "#0f172a" : "#f1f5f9",
          border: "1px solid #1e293b", borderRadius: 12, padding: 24,
        }}>
          <div style={{ fontSize: 11, color: darkMode ? "#475569" : "#64748b", letterSpacing: "0.1em", marginBottom: 20 }}>
            CONFUSION MATRIX
          </div>
          {metrics ? (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 1fr", gap: 8, fontSize: 11 }}>
                <div />
                <div style={{ color: "#64748b", textAlign: "center" }}>Predicted: FRAUD</div>
                <div style={{ color: "#64748b", textAlign: "center" }}>Predicted: LEGIT</div>
                <div style={{ color: "#64748b", display: "flex", alignItems: "center" }}>Actual: FRAUD</div>
                <div style={{ background: darkMode ? "#14532d55" : "#d1fae5", border: darkMode ? "1px solid #22c55e44" : "1px solid #16a34a", borderRadius: 8, padding: "20px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: darkMode ? "#34d399" : "#166534" }}>{metrics.tp}</div>
                  <div style={{ fontSize: 10, color: darkMode ? "#16a34a" : "#166534" }}>True Positive</div>
                </div>
                <div style={{ background: darkMode ? "#7f1d1d55" : "#fee2e2", border: darkMode ? "1px solid #ef444444" : "1px solid #dc2626", borderRadius: 8, padding: "20px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: darkMode ? "#f87171" : "#b91c1c" }}>{metrics.fn}</div>
                  <div style={{ fontSize: 10, color: darkMode ? "#dc2626" : "#b91c1c" }}>False Negative</div>
                </div>
                <div style={{ color: "#64748b", display: "flex", alignItems: "center" }}>Actual: LEGIT</div>
                <div style={{ background: darkMode ? "#7f1d1d55" : "#fee2e2", border: darkMode ? "1px solid #ef444444" : "1px solid #dc2626", borderRadius: 8, padding: "20px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: darkMode ? "#f87171" : "#b91c1c" }}>{metrics.fp}</div>
                  <div style={{ fontSize: 10, color: darkMode ? "#dc2626" : "#b91c1c" }}>False Positive</div>
                </div>
                <div style={{ background: darkMode ? "#1e1b4b55" : "#dbeafe", border: darkMode ? "1px solid #6366f144" : "1px solid #2563eb", borderRadius: 8, padding: "20px 0", textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: darkMode ? "#818cf8" : "#1e40af" }}>{metrics.tn}</div>
                  <div style={{ fontSize: 10, color: darkMode ? "#6366f1" : "#1e40af" }}>True Negative</div>
                </div>
              </div>
              <div style={{ marginTop: 20, padding: 14, background: darkMode ? "#1e293b" : "#f8fafc", borderRadius: 8, fontSize: 12, color: darkMode ? "#94a3b8" : "#475569", lineHeight: 1.7 }}>
                <strong style={{ color: darkMode ? "#f1f5f9" : "#1e293b" }}>Interpretation: </strong>
                High precision means fewer false alarms. High recall means fewer missed frauds.
                F1 balances both for real-world deployment decisions.
              </div>
            </div>
          ) : (
            <div style={{ color: "#334155", textAlign: "center", paddingTop: 60 }}>
              Awaiting analysis...
            </div>
          )}
        </div>
      </div>

      <MerchantAnalysis transactions={transactions} darkMode={darkMode} />

    </div>
  );
}

