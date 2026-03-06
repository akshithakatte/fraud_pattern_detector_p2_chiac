import { useState, useEffect, useRef } from "react";
import { Search, Filter, Download, Settings, Play, Pause, RotateCcw, TrendingUp, AlertTriangle, CheckCircle, XCircle, BarChart3, Activity, Shield, Eye, EyeOff, Moon, Sun, ChevronDown, ChevronUp, Info, Zap, Database, Brain, Clock } from "lucide-react";
import jsPDF from 'jspdf';

// ─── Synthetic Dataset Generator ───────────────────────────────────────────
function generateTransactions(n = 200, seed = null) {
  // Simple seeded random number generator for reproducibility
  if (seed !== null) {
    let seedValue = seed;
    Math.random = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };
  }
  
  const merchants = ["Amazon", "Walmart", "Starbucks", "Shell", "Netflix", "Uber", "Casino Royale", "QuickCash ATM", "Unknown Vendor", "BestBuy"];
  const countries = ["US", "US", "US", "US", "UK", "CA", "NG", "RU", "CN", "US"];
  const txns = [];
  let currentTime = new Date().getTime() - (24 * 60 * 60 * 1000); // Start from 24 hours ago
  for (let i = 0; i < n; i++) {
    const isFraud = Math.random() < 0.18;
    const mIdx = isFraud ? Math.floor(Math.random() * 3) + 6 : Math.floor(Math.random() * 6);
    const amount = isFraud
      ? parseFloat((Math.random() * 4800 + 200).toFixed(2))
      : parseFloat((Math.random() * 300 + 5).toFixed(2));
    const hour = isFraud
      ? Math.floor(Math.random() * 5) // 0–4 AM
      : Math.floor(Math.random() * 14) + 8; // 8AM–10PM
    const country = isFraud ? countries[Math.floor(Math.random() * 3) + 6] : "US";
    const prevTxnGap = isFraud ? Math.floor(Math.random() * 30) : Math.floor(Math.random() * 1440) + 60;
    // Advance time by prevTxnGap minutes for next transaction, but for current, set timestamp
    const timestamp = new Date(currentTime);
    currentTime += prevTxnGap * 60 * 1000; // Add gap in milliseconds
    txns.push({
      id: `TXN-${String(i + 1).padStart(4, "0")}`,
      merchant: merchants[mIdx],
      amount,
      hour,
      country,
      prevTxnGap, // minutes since last transaction
      timestamp,
      isActualFraud: isFraud,
      flaggedAsFraud: null,
      score: null,
      reasons: [],
      status: "pending",
    });
  }
  return txns;
}

// ─── Enhanced Fraud Scorer with Customizable Weights ───────────────────────────────────
function scoreTransaction(txn, threshold = 50, weights = {}) {
  const defaultWeights = { highAmount: 35, oddHour: 25, riskyCountry: 30, rapidTxn: 20, suspiciousMerchant: 25 };
  const w = { ...defaultWeights, ...weights };
  let score = 0;
  const reasons = [];

  if (txn.amount > 1000) { score += w.highAmount; reasons.push(`High amount $${txn.amount}`); }
  else if (txn.amount > 500) { score += Math.floor(w.highAmount * 0.4); reasons.push(`Elevated amount $${txn.amount}`); }

  if (txn.hour >= 0 && txn.hour <= 4) { score += w.oddHour; reasons.push(`Odd hour (${txn.hour}:00)`); }

  if (!["US", "UK", "CA"].includes(txn.country)) { score += w.riskyCountry; reasons.push(`High-risk country (${txn.country})`); }

  if (txn.prevTxnGap < 5) { score += w.rapidTxn; reasons.push(`Rapid successive txn (${txn.prevTxnGap}min gap)`); }

  if (["Casino Royale", "QuickCash ATM", "Unknown Vendor"].includes(txn.merchant)) {
    score += w.suspiciousMerchant; reasons.push(`Suspicious merchant`);
  }

  const flagged = score >= threshold;
  return { score: Math.min(score, 100), flaggedAsFraud: flagged, reasons };
}

// ─── Metrics Calculator ─────────────────────────────────────────────────────
function calcMetrics(txns) {
  const processed = txns.filter(t => t.status === "done");
  if (!processed.length) return null;
  let tp = 0, fp = 0, fn = 0, tn = 0;
  processed.forEach(t => {
    if (t.isActualFraud && t.flaggedAsFraud) tp++;
    else if (!t.isActualFraud && t.flaggedAsFraud) fp++;
    else if (t.isActualFraud && !t.flaggedAsFraud) fn++;
    else tn++;
  });
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? 2 * precision * recall / (precision + recall) : 0;
  const accuracy = (tp + tn) / processed.length;
  return { tp, fp, fn, tn, precision, recall, f1, accuracy, total: processed.length };
}

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

// ─── Transaction Timeline Component ───────────────────────────────────────────
function TransactionTimeline({ transactions, darkMode }) {
  const processedTxns = transactions.filter(t => t.status === "done").sort((a, b) => a.timestamp - b.timestamp);
  if (processedTxns.length === 0) return null;

  const containerWidth = 1000;
  const circleRadius = 8;
  const minSpacing = 4;
  const maxCircles = Math.floor(containerWidth / (circleRadius * 2 + minSpacing));
  const displayTxns = processedTxns.length > maxCircles ? 
    processedTxns.slice(-maxCircles) : processedTxns;

  return (
    <div style={{
      background: darkMode ? "#0f172a" : "#f1f5f9", 
      border: "1px solid #1e293b", 
      borderRadius: 12, 
      padding: 24,
      marginTop: 20,
      gridColumn: "1 / -1",
    }}>
      <div style={{ fontSize: 11, color: darkMode ? "#475569" : "#64748b", letterSpacing: "0.1em", marginBottom: 20 }}>
        TRANSACTION FLEET TIMELINE
      </div>
      
      {/* Timeline container */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "relative",
        height: 60,
        overflow: "hidden",
      }}>
        {/* Horizontal line */}
        <div style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: 2,
          background: darkMode ? "#334155" : "#cbd5e1",
          transform: "translateY(-50%)",
        }} />
        
        {/* Transaction circles */}
        {displayTxns.map((txn, i) => {
          const color = txn.flaggedAsFraud ? "#f87171" : "#34d399";
          const size = txn.isActualFraud ? circleRadius + 2 : circleRadius;
          const opacity = txn.flaggedAsFraud ? 1 : 0.7;
          
          return (
            <div
              key={txn.id}
              style={{
                width: size * 2,
                height: size * 2,
                borderRadius: "50%",
                background: color,
                opacity,
                border: txn.isActualFraud ? `2px solid ${darkMode ? "#fbbf24" : "#f59e0b"}` : "none",
                cursor: "pointer",
                transition: "all 0.2s",
                zIndex: 2,
                position: "relative",
              }}
              title={`${txn.id} - ${txn.merchant} - $${txn.amount.toFixed(2)} - ${txn.flaggedAsFraud ? "FRAUD" : "CLEAR"}`}
            />
          );
        })}
      </div>
      
      {/* Legend */}
      <div style={{ display: "flex", justifyContent: "center", gap: 24, marginTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: darkMode ? "#94a3b8" : "#64748b" }}>
          <div style={{ width: 12, height: 12, background: "#34d399", borderRadius: "50%", opacity: 0.7 }} />
          Clear Transaction
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: darkMode ? "#94a3b8" : "#64748b" }}>
          <div style={{ width: 12, height: 12, background: "#f87171", borderRadius: "50%" }} />
          Flagged Fraud
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: darkMode ? "#94a3b8" : "#64748b" }}>
          <div style={{ width: 14, height: 14, background: "#34d399", borderRadius: "50%", opacity: 0.7, border: "2px solid #fbbf24" }} />
          Actual Fraud (border)
        </div>
      </div>
      
      {/* Stats */}
      <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 16, fontSize: 10, color: darkMode ? "#64748b" : "#475569" }}>
        <span>Total: {processedTxns.length}</span>
        <span>Showing: {displayTxns.length}</span>
        <span>Fraud: {processedTxns.filter(t => t.flaggedAsFraud).length}</span>
        <span>Actual Fraud: {processedTxns.filter(t => t.isActualFraud).length}</span>
      </div>
    </div>
  );
}

// ─── Merchant Analysis Component ───────────────────────────────────────────
function MerchantAnalysis({ transactions, darkMode }) {
  const processedTxns = transactions.filter(t => t.status === "done");
  if (processedTxns.length === 0) return null;

  // Group by merchant
  const merchantData = {};
  processedTxns.forEach(txn => {
    if (!merchantData[txn.merchant]) {
      merchantData[txn.merchant] = {
        total: 0,
        fraud: 0,
        actualFraud: 0,
        totalAmount: 0,
        fraudAmount: 0
      };
    }
    merchantData[txn.merchant].total++;
    merchantData[txn.merchant].totalAmount += txn.amount;
    if (txn.flaggedAsFraud) {
      merchantData[txn.merchant].fraud++;
      merchantData[txn.merchant].fraudAmount += txn.amount;
    }
    if (txn.isActualFraud) {
      merchantData[txn.merchant].actualFraud++;
    }
  });

  // Sort by fraud rate
  const sortedMerchants = Object.entries(merchantData)
    .map(([merchant, data]) => ({
      merchant,
      ...data,
      fraudRate: (data.fraud / data.total) * 100,
      actualFraudRate: (data.actualFraud / data.total) * 100,
      avgAmount: data.totalAmount / data.total
    }))
    .sort((a, b) => b.fraudRate - a.fraudRate);

  return (
    <div style={{
      background: darkMode ? "#0f172a" : "#f1f5f9", 
      border: "1px solid #1e293b", 
      borderRadius: 12, 
      padding: 24,
      marginTop: 20,
      gridColumn: "1 / -1",
    }}>
      <div style={{ fontSize: 11, color: darkMode ? "#475569" : "#64748b", letterSpacing: "0.1em", marginBottom: 20 }}>
        MERCHANT ANALYSIS
      </div>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        {sortedMerchants.map(({ merchant, total, fraud, actualFraud, fraudRate, actualFraudRate, avgAmount, totalAmount }) => {
          const isHighRisk = fraudRate > 30;
          const barColor = isHighRisk ? "#f87171" : fraudRate > 15 ? "#fb923c" : "#34d399";
          
          return (
            <div key={merchant} style={{
              background: darkMode ? "#1e293b" : "#fff",
              border: `1px solid ${isHighRisk ? "#f8717133" : darkMode ? "#334155" : "#e2e8f0"}`,
              borderRadius: 8,
              padding: 16,
              transition: "all 0.2s",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: darkMode ? "#e2e8f0" : "#1e293b" }}>
                  {merchant}
                </div>
                <div style={{
                  fontSize: 10,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: isHighRisk ? "#7f1d1d" : fraudRate > 15 ? "#78350f" : "#14532d",
                  color: isHighRisk ? "#f87171" : fraudRate > 15 ? "#fb923c" : "#34d399",
                }}>
                  {fraudRate.toFixed(1)}% fraud
                </div>
              </div>
              
              {/* Fraud rate bar */}
              <div style={{ marginBottom: 12 }}>
                <div style={{
                  height: 6,
                  background: darkMode ? "#0f172a" : "#f1f5f9",
                  borderRadius: 3,
                  overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%",
                    width: `${Math.min(fraudRate, 100)}%`,
                    background: barColor,
                    borderRadius: 3,
                    transition: "width 0.3s",
                  }} />
                </div>
              </div>
              
              {/* Stats */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11 }}>
                <div>
                  <div style={{ color: darkMode ? "#64748b" : "#475569" }}>Transactions</div>
                  <div style={{ fontWeight: 600, color: darkMode ? "#e2e8f0" : "#1e293b" }}>{total}</div>
                </div>
                <div>
                  <div style={{ color: darkMode ? "#64748b" : "#475569" }}>Flagged Fraud</div>
                  <div style={{ fontWeight: 600, color: "#f87171" }}>{fraud}</div>
                </div>
                <div>
                  <div style={{ color: darkMode ? "#64748b" : "#475569" }}>Avg Amount</div>
                  <div style={{ fontWeight: 600, color: darkMode ? "#e2e8f0" : "#1e293b" }}>${avgAmount.toFixed(0)}</div>
                </div>
                <div>
                  <div style={{ color: darkMode ? "#64748b" : "#475569" }}>Total Volume</div>
                  <div style={{ fontWeight: 600, color: darkMode ? "#e2e8f0" : "#1e293b" }}>${totalAmount.toFixed(0)}</div>
                </div>
              </div>
              
              {actualFraud > 0 && (
                <div style={{ marginTop: 8, fontSize: 10, color: darkMode ? "#fbbf24" : "#f59e0b" }}>
                  ⚠ {actualFraud} actual fraud case{actualFraud > 1 ? 's' : ''}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Summary */}
      <div style={{ 
        marginTop: 20, 
        padding: 12, 
        background: darkMode ? "#1e293b" : "#f8fafc", 
        borderRadius: 8,
        fontSize: 11,
        color: darkMode ? "#94a3b8" : "#475569"
      }}>
        <div style={{ display: "flex", justifyContent: "space-around", textAlign: "center" }}>
          <div>
            <div style={{ fontWeight: 600, color: darkMode ? "#e2e8f0" : "#1e293b" }}>{sortedMerchants.length}</div>
            <div>Unique Merchants</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, color: "#f87171" }}>
              {sortedMerchants.filter(m => m.fraudRate > 30).length}
            </div>
            <div>High Risk (&gt;30%)</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, color: "#fb923c" }}>
              {sortedMerchants.filter(m => m.fraudRate > 15 && m.fraudRate <= 30).length}
            </div>
            <div>Medium Risk (15-30%)</div>
          </div>
          <div>
            <div style={{ fontWeight: 600, color: "#34d399" }}>
              {sortedMerchants.filter(m => m.fraudRate <= 15).length}
            </div>
            <div>Low Risk (≤15%)</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Fraud Alerts Ticker Component ───────────────────────────────────────────
function FraudAlertsTicker({ transactions, darkMode }) {
  const processedTxns = transactions.filter(t => t.status === "done" && t.flaggedAsFraud);
  if (processedTxns.length === 0) return null;

  const [currentPage, setCurrentPage] = useState(0);
  const alertsPerPage = 5;
  const totalPages = Math.ceil(processedTxns.length / alertsPerPage);
  
  const startIndex = (totalPages - 1 - currentPage) * alertsPerPage;
  const endIndex = Math.min(startIndex + alertsPerPage, processedTxns.length);
  const currentAlerts = processedTxns.slice(startIndex, endIndex).reverse();

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div style={{
      background: darkMode ? "#0f172a" : "#f1f5f9", 
      border: "1px solid #1e293b", 
      borderRadius: 12, 
      padding: 20,
      marginTop: 20,
      gridColumn: "1 / -1",
    }}>
      <div style={{ fontSize: 11, color: darkMode ? "#475569" : "#64748b", letterSpacing: "0.1em", marginBottom: 16 }}>
        🚨 LIVE FRAUD ALERTS
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {currentAlerts.map((alert, i) => (
          <div key={alert.id} style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            background: darkMode ? "#7f1d1d22" : "#fef2f2",
            border: `1px solid ${darkMode ? "#f8717133" : "#f8717166"}`,
            borderRadius: 8,
            borderLeft: `4px solid #f87171`,
            animation: i === 0 && currentPage === totalPages - 1 ? "pulse 2s infinite" : "none",
          }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#f87171",
              animation: i === 0 && currentPage === totalPages - 1 ? "blink 1s infinite" : "none",
            }} />
            
            <div style={{ flex: 1 }}>
              <div style={{ 
                fontSize: 12, 
                fontWeight: 600, 
                color: darkMode ? "#f87171" : "#dc2626",
                marginBottom: 2 
              }}>
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
              fontSize: 10,
              padding: "4px 8px",
              background: darkMode ? "#7f1d1d" : "#dc2626",
              color: "#fff",
              borderRadius: 4,
              fontWeight: 600,
            }}>
              FRAUD
            </div>
          </div>
        ))}
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginTop: 16,
          padding: "12px 16px",
          background: darkMode ? "#1e293b" : "#f8fafc",
          borderRadius: 8,
        }}>
          <button
            onClick={handlePrev}
            disabled={currentPage === 0}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              background: currentPage === 0 
                ? (darkMode ? "#0f172a" : "#f1f5f9")
                : (darkMode ? "#334155" : "#e2e8f0"),
              border: `1px solid ${darkMode ? "#475569" : "#cbd5e1"}`,
              borderRadius: 6,
              color: currentPage === 0 
                ? (darkMode ? "#475569" : "#94a3b8")
                : (darkMode ? "#e2e8f0" : "#475569"),
              fontSize: 11,
              cursor: currentPage === 0 ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            ← Previous {alertsPerPage}
          </button>
          
          <div style={{ fontSize: 11, color: darkMode ? "#94a3b8" : "#475569" }}>
            Page {currentPage + 1} of {totalPages} • {processedTxns.length} total alerts
          </div>
          
          <button
            onClick={handleNext}
            disabled={currentPage === totalPages - 1}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              background: currentPage === totalPages - 1 
                ? (darkMode ? "#0f172a" : "#f1f5f9")
                : (darkMode ? "#334155" : "#e2e8f0"),
              border: `1px solid ${darkMode ? "#475569" : "#cbd5e1"}`,
              borderRadius: 6,
              color: currentPage === totalPages - 1 
                ? (darkMode ? "#475569" : "#94a3b8")
                : (darkMode ? "#e2e8f0" : "#475569"),
              fontSize: 11,
              cursor: currentPage === totalPages - 1 ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            Next {alertsPerPage} →
          </button>
        </div>
      )}
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        @keyframes blink {
          0%, 50%, 100% { opacity: 1; }
          25%, 75% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

// ─── Enhanced Log Line with Dark Mode Support ────────────────────────────────────────
function LogLine({ line, darkMode }) {
  const color = line.startsWith("[FRAUD]") ? "#f87171"
    : line.startsWith("[CLEAR]") ? "#34d399"
    : line.startsWith("[AGENT]") ? "#818cf8"
    : darkMode ? "#94a3b8" : "#64748b";
  return <div style={{ color, fontFamily: "monospace", fontSize: 12, lineHeight: "1.7", whiteSpace: "pre-wrap" }}>{line}</div>;
}

// ─── Main App ───────────────────────────────────────────────────────────────
export default function FraudDetectionAgent() {
  const [numTransactions, setNumTransactions] = useState(120);
  const [inputValue, setInputValue] = useState(numTransactions.toString());
  const [seed, setSeed] = useState(24); // Default seed for reproducibility
  const [transactions, setTransactions] = useState(() => generateTransactions(numTransactions, seed));
  const [running, setRunning] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [logs, setLogs] = useState(["[AGENT] Fraud Detection Agent initialized. Press RUN to start analysis."]);
  const [speed, setSpeed] = useState(60);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [darkMode, setDarkMode] = useState(true);
  const [fraudThreshold, setFraudThreshold] = useState(50);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [showRuleWeights, setShowRuleWeights] = useState(false);
  const [ruleWeights, setRuleWeights] = useState({
    highAmount: 35,
    oddHour: 25,
    riskyCountry: 30,
    rapidTxn: 20,
    suspiciousMerchant: 25
  });
  const logRef = useRef(null);
  const intervalRef = useRef(null);

  const metrics = calcMetrics(transactions);
  const processed = transactions.filter(t => t.status === "done").length;
  const flagged = transactions.filter(t => t.flaggedAsFraud).length;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    setInputValue(numTransactions.toString());
  }, [numTransactions]);

  const pushLog = (line) => setLogs(prev => [...prev.slice(-300), line]);

  const runAgent = () => {
    if (running) return;
    setRunning(true);
    pushLog(`[AGENT] Starting batch analysis of ${transactions.length} transactions with threshold ${fraudThreshold}%...`);

    intervalRef.current = setInterval(() => {
      setCursor(prev => {
        const idx = prev;
        if (idx >= transactions.length) {
          clearInterval(intervalRef.current);
          setRunning(false);
          pushLog("[AGENT] ✓ Batch complete. Metrics finalized.");
          return prev;
        }
        const txn = transactions[idx];
        const { score, flaggedAsFraud, reasons } = scoreTransaction(txn, fraudThreshold, ruleWeights);

        setTransactions(all => {
          const copy = [...all];
          copy[idx] = { ...copy[idx], score, flaggedAsFraud, reasons, status: "done" };
          return copy;
        });

        const tag = flaggedAsFraud ? "[FRAUD]" : "[CLEAR]";
        const reasonStr = reasons.length ? ` → ${reasons.join(", ")}` : "";
        pushLog(`${tag} ${txn.id} | $${txn.amount.toFixed(2)} @ ${txn.merchant} | score=${score}${reasonStr}`);

        return idx + 1;
      });
    }, speed);
  };

  const reset = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
    setCursor(0);
    setTransactions(generateTransactions(numTransactions, seed));
    setLogs(["[AGENT] Reset. New synthetic dataset generated with seed " + seed + ". Press RUN to analyze."]);
  };

  const fraudTxns = transactions.filter(t => t.flaggedAsFraud && t.status === "done");
  const clearTxns = transactions.filter(t => !t.flaggedAsFraud && t.status === "done");
  
  // Filter transactions based on search and filter type
  const filteredTransactions = transactions.filter(t => t.status === "done").filter(t => {
    const matchesSearch = searchQuery === "" || 
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.country.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = filterType === "all" || 
      (filterType === "fraud" && t.flaggedAsFraud) ||
      (filterType === "clear" && !t.flaggedAsFraud);
    
    return matchesSearch && matchesFilter;
  });
  
  const exportData = () => {
    const csvContent = [
      ["ID", "Merchant", "Amount", "Hour", "Country", "Gap", "Score", "Flagged", "Actual Fraud", "Reasons"].join(","),
      ...transactions.filter(t => t.status === "done").map(t => 
        [t.id, t.merchant, t.amount, t.hour, t.country, t.prevTxnGap, t.score, t.flaggedAsFraud, t.isActualFraud, t.reasons.join(";")].join(",")
      )
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fraud_detection_results.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    pushLog("[AGENT] ✓ Data exported to CSV");
  };
  const exportPDF = () => {
    if (transactions.filter(t => t.status === "done").length === 0) return;
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(24);
    doc.setTextColor(99, 102, 241);
    doc.text('FRAUDGUARD', 20, 30);
    doc.setFontSize(16);
    doc.setTextColor(34, 211, 238);
    doc.text('Detection Report', 20, 40);
    
    // Separator line
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.5);
    doc.line(20, 45, 190, 45);
    
    // Report metadata
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(10);
    doc.text('Generated on: ' + new Date().toLocaleString(), 20, 55);
    doc.text('Report ID: FG-' + Date.now().toString().slice(-8), 20, 62);
    
    // Summary section
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('EXECUTIVE SUMMARY', 20, 75);
    doc.setFont(undefined, 'normal');
    
    doc.setFontSize(11);
    doc.text('Total Transactions Analyzed: ' + transactions.length, 20, 85);
    doc.text('Transactions Processed: ' + processed, 20, 92);
    doc.text('Flagged as Fraudulent: ' + flagged, 20, 99);
    doc.text('Fraud Detection Rate: ' + (processed ? ((flagged / processed) * 100).toFixed(1) + '%' : 'N/A'), 20, 106);
    
    // Performance Metrics
    if (metrics) {
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('PERFORMANCE METRICS', 20, 120);
      doc.setFont(undefined, 'normal');
      
      doc.setFontSize(11);
      doc.text('Precision: ' + (metrics.precision * 100).toFixed(1) + '%', 20, 130);
      doc.text('Recall: ' + (metrics.recall * 100).toFixed(1) + '%', 20, 137);
      doc.text('F1 Score: ' + (metrics.f1 * 100).toFixed(1) + '%', 20, 144);
      doc.text('Accuracy: ' + (metrics.accuracy * 100).toFixed(1) + '%', 20, 151);
      
      // Confusion Matrix
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('CONFUSION MATRIX', 20, 165);
      doc.setFont(undefined, 'normal');
      
      doc.setFontSize(11);
      doc.text('True Positives (TP): ' + metrics.tp, 20, 175);
      doc.text('False Positives (FP): ' + metrics.fp, 20, 182);
      doc.text('False Negatives (FN): ' + metrics.fn, 20, 189);
      doc.text('True Negatives (TN): ' + metrics.tn, 20, 196);
      
      // Interpretation
      doc.setFontSize(10);
      doc.setFont(undefined, 'italic');
      doc.text('Interpretation: High precision means fewer false alarms. High recall means', 20, 210);
      doc.text('fewer missed frauds. F1 score provides a balanced measure of both.', 20, 216);
    }
    
    // Footer
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text('Generated by FraudGuard AI Agent v2.1 | Rule-Based Transaction Fraud Scoring Engine', 20, 280);
    
    doc.save('fraud_detection_report.pdf');
    pushLog("[AGENT] ✓ Enhanced PDF report exported");
  };

  const tabStyle = (tab) => ({
    padding: "8px 20px", borderRadius: 6, border: "none", cursor: "pointer",
    fontFamily: "monospace", fontSize: 12, letterSpacing: "0.05em",
    background: activeTab === tab ? "#6366f1" : "transparent",
    color: activeTab === tab ? "#fff" : "#64748b",
    transition: "all 0.2s",
  });

  return (
    <div style={{
      width: "100vw", minHeight: "100vh", background: darkMode ? "#030712" : "#f8fafc",
      fontFamily: "'DM Mono', 'Fira Code', monospace",
      color: darkMode ? "#e2e8f0" : "#1e293b", padding: "0", margin: "0",
      transition: "all 0.3s ease", boxSizing: "border-box", overflowX: "hidden",
    }}>
      {/* Enhanced Header */}
      <div style={{
        background: darkMode ? "linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)" : "linear-gradient(135deg, #e2e8f0 0%, #f1f5f9 100%)",
        borderBottom: darkMode ? "1px solid #1e293b" : "1px solid #cbd5e1",
        padding: "20px 32px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Shield style={{ width: 24, height: 24, color: "#22d3ee" }} />
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.02em", color: darkMode ? "#f1f5f9" : "#1e293b" }}>
              FRAUD<span style={{ color: "#22d3ee" }}>GUARD</span>
            </span>
            <span style={{
              background: darkMode ? "#1e293b" : "rgba(0,0,0,0.1)", color: darkMode ? "#64748b" : "#475569",
              fontSize: 10, padding: "2px 8px", borderRadius: 4, letterSpacing: "0.1em",
            }}>AI AGENT v2.1</span>
          </div>
          <div style={{ fontSize: 11, color: darkMode ? "#475569" : "rgba(0,0,0,0.7)", marginTop: 4 }}>
            Rule-Based Transaction Fraud Scoring Engine
          </div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={() => setDarkMode(!darkMode)}
            style={{
              background: darkMode ? "#1e293b" : "rgba(0,0,0,0.05)",
              border: darkMode ? "1px solid #334155" : "1px solid rgba(0,0,0,0.1)",
              color: darkMode ? "#94a3b8" : "#475569", padding: "8px", borderRadius: 6,
              cursor: "pointer", display: "flex", alignItems: "center",
            }}
          >
            {darkMode ? <Sun style={{ width: 16, height: 16 }} /> : <Moon style={{ width: 16, height: 16 }} />}
          </button>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            style={{
              background: darkMode ? "#1e293b" : "rgba(0,0,0,0.05)",
              border: darkMode ? "1px solid #334155" : "1px solid rgba(0,0,0,0.1)",
              color: darkMode ? "#94a3b8" : "#475569", padding: "8px", borderRadius: 6,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}
          >
            <Settings style={{ width: 16, height: 16 }} />
            <span style={{ fontSize: 12 }}>Advanced</span>
            {showAdvanced ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
          </button>
          <select
            value={speed}
            onChange={e => setSpeed(Number(e.target.value))}
            disabled={running}
            style={{
              background: darkMode ? "#1e293b" : "rgba(0,0,0,0.05)",
              border: darkMode ? "1px solid #334155" : "1px solid rgba(0,0,0,0.1)",
              color: darkMode ? "#94a3b8" : "#475569", padding: "6px 12px", borderRadius: 6,
              fontSize: 12, fontFamily: "monospace",
            }}
          >
            <option value={200}>🐢 Slow</option>
            <option value={60}>⚡ Normal</option>
            <option value={10}>🚀 Fast</option>
          </select>
          <button onClick={reset} style={{
            background: darkMode ? "#1e293b" : "rgba(0,0,0,0.05)",
            border: darkMode ? "1px solid #334155" : "1px solid rgba(0,0,0,0.1)",
            color: darkMode ? "#94a3b8" : "#475569", padding: "8px 16px", borderRadius: 6,
            cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", gap: 6,
          }}>
            <RotateCcw style={{ width: 14, height: 14 }} /> Reset
          </button>
          <button onClick={runAgent} disabled={running || cursor >= transactions.length} style={{
            background: running ? (darkMode ? "#1e293b" : "rgba(0,0,0,0.1)") : "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none", color: running ? (darkMode ? "#64748b" : "#475569") : "#fff",
            padding: "8px 24px", borderRadius: 6, cursor: running ? "not-allowed" : "pointer",
            fontSize: 13, fontWeight: 700, letterSpacing: "0.05em",
            boxShadow: running ? "none" : "0 0 20px #6366f155", display: "flex", alignItems: "center", gap: 8,
          }}>
            {running ? <><Activity style={{ width: 14, height: 14 }} /> ANALYZING...</> : cursor >= transactions.length ? <><CheckCircle style={{ width: 14, height: 14 }} /> DONE</> : <><Play style={{ width: 14, height: 14 }} /> RUN AGENT</>}
          </button>
        </div>
      </div>

      {/* Advanced Settings Panel */}
      {showAdvanced && (
        <div style={{
          background: darkMode ? "#0f172a" : "#f1f5f9",
          borderBottom: darkMode ? "1px solid #1e293b" : "1px solid #e2e8f0",
          padding: "20px 32px", display: "flex", gap: 40, alignItems: "center",
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: darkMode ? "#64748b" : "#475569", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Brain style={{ width: 14, height: 14 }} /> Fraud Threshold: {fraudThreshold}%
            </div>
            <input
              type="range"
              min="30"
              max="80"
              value={fraudThreshold}
              onChange={e => setFraudThreshold(Number(e.target.value))}
              disabled={running}
              style={{ width: "100%", height: 4, background: darkMode ? "#1e293b" : "#cbd5e1", borderRadius: 2, outline: "none" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: darkMode ? "#475569" : "#64748b", marginTop: 4 }}>
              <span>More Sensitive</span>
              <span>Less Sensitive</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: darkMode ? "#64748b" : "#475569", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Settings style={{ width: 14, height: 14 }} /> Rule Weights
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {Object.entries(ruleWeights).map(([key, value]) => (
                <div key={key} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <label style={{ fontSize: 10, color: darkMode ? "#475569" : "#64748b" }}>
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={value}
                    onChange={e => setRuleWeights(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                    disabled={running}
                    style={{
                      background: darkMode ? "#1e293b" : "#fff",
                      border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                      color: darkMode ? "#94a3b8" : "#1e293b", padding: "4px 6px",
                      borderRadius: 4, fontSize: 11, width: "80px", height: "28px",
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: darkMode ? "#64748b" : "#475569", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Database style={{ width: 14, height: 14 }} /> Number of Transactions
            </div>
            <input
              type="number"
              min="50"
              max="500"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onBlur={() => {
                const val = Number(inputValue);
                const clamped = Math.max(50, Math.min(500, val || 50));
                setNumTransactions(clamped);
                setInputValue(clamped.toString());
              }}
              disabled={running}
              style={{
                background: darkMode ? "#1e293b" : "#fff",
                border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                color: darkMode ? "#94a3b8" : "#1e293b", padding: "4px 6px",
                borderRadius: 4, fontSize: 12, width: "120px", height: "32px",
              }}
            />
            <div style={{ fontSize: 10, color: darkMode ? "#475569" : "#64748b", marginTop: 4 }}>
              50–500 transactions. Changes apply on Reset.
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: darkMode ? "#64748b" : "#475569", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <Brain style={{ width: 14, height: 14 }} /> Random Seed
            </div>
            <input
              type="number"
              value={seed}
              onChange={e => setSeed(Number(e.target.value))}
              disabled={running}
              style={{
                background: darkMode ? "#1e293b" : "#fff",
                border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
                color: darkMode ? "#94a3b8" : "#1e293b", padding: "4px 6px",
                borderRadius: 4, fontSize: 12, width: "120px", height: "32px",
              }}
            />
            <div style={{ fontSize: 10, color: darkMode ? "#475569" : "#64748b", marginTop: 4 }}>
              Use same seed for reproducible datasets.
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Stats Row */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
        gap: 1, background: darkMode ? "#1e293b" : "#e2e8f0",
        borderBottom: darkMode ? "1px solid #1e293b" : "1px solid #cbd5e1",
      }}>
        {[
          { label: "TOTAL TXNs", value: transactions.length, color: "#818cf8", icon: Database },
          { label: "PROCESSED", value: processed, color: "#22d3ee", icon: Activity },
          { label: "FLAGGED FRAUD", value: flagged, color: "#f87171", icon: AlertTriangle },
          { label: "FRAUD RATE", value: processed ? (Math.round((flagged / processed) * 1000) / 10 + "%") : "—", color: "#fb923c", icon: TrendingUp },
          { label: "PENDING", value: transactions.length - processed, color: "#64748b", icon: Clock },
        ].map(s => (
          <div key={s.label} style={{ background: darkMode ? "#030712" : "#fff", padding: "16px 24px", transition: "all 0.2s", ":hover": { transform: "translateY(-2px)" } }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <s.icon style={{ width: 14, height: 14, color: s.color }} />
              <div style={{ fontSize: 10, color: darkMode ? "#475569" : "#64748b", letterSpacing: "0.1em" }}>{s.label}</div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Enhanced Tabs */}
      <div style={{ padding: "16px 32px 0", display: "flex", gap: 4, borderBottom: darkMode ? "1px solid #1e293b" : "1px solid #e2e8f0" }}>
        {[
          { id: "dashboard", label: "Dashboard", icon: BarChart3 },
          { id: "transactions", label: "Transactions", icon: Database },
          { id: "agent log", label: "Agent Log", icon: Activity },
        ].map(tab => (
          <button
            key={tab.id}
            style={{
              ...tabStyle(tab.id),
              display: "flex", alignItems: "center", gap: 6,
              background: activeTab === tab.id ? "#6366f1" : darkMode ? "transparent" : "#e2e8f0",
              color: activeTab === tab.id ? "#fff" : (darkMode ? "#64748b" : "#475569"),
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon style={{ width: 14, height: 14 }} />
            {tab.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={exportData}
            disabled={transactions.filter(t => t.status === "done").length === 0}
            style={{
              background: darkMode ? "#1e293b" : "#fff",
              border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
              color: darkMode ? "#94a3b8" : "#475569", padding: "6px 12px", borderRadius: 6,
              cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 6,
              opacity: transactions.filter(t => t.status === "done").length === 0 ? 0.5 : 1,
            }}
          >
            <Download style={{ width: 12, height: 12 }} /> Export CSV
          </button>
          <button
            onClick={exportPDF}
            disabled={transactions.filter(t => t.status === "done").length === 0}
            style={{
              background: darkMode ? "#1e293b" : "#fff",
              border: darkMode ? "1px solid #334155" : "1px solid #cbd5e1",
              color: darkMode ? "#94a3b8" : "#475569", padding: "6px 12px", borderRadius: 6,
              cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 6,
              opacity: transactions.filter(t => t.status === "done").length === 0 ? 0.5 : 1,
            }}
          >
            <Download style={{ width: 12, height: 12 }} /> Export PDF
          </button>
        </div>
      </div>

      <div style={{ padding: "24px 32px" }}>

        {/* DASHBOARD TAB */}
        {activeTab === "dashboard" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
            <TransactionTimeline transactions={transactions} darkMode={darkMode} />
            <FraudAlertsTicker transactions={transactions} darkMode={darkMode} />
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Metrics Gauges */}
              <div style={{
                background: darkMode ? "#0f172a" : "#f1f5f9", border: "1px solid #1e293b", borderRadius: 12, padding: 24,
              }}>
                <div style={{ fontSize: 11, color: darkMode ? "#475569" : "#64748b", letterSpacing: "0.1em", marginBottom: 24 }}>
                  PRECISION / RECALL / F1 / ACCURACY
                </div>
                {metrics ? (
                  <div style={{ display: "flex", justifyContent: "space-around" }}>
                    <Gauge value={metrics.precision} label="Precision" color="#6366f1" />
                    <Gauge value={metrics.recall} label="Recall" color="#22d3ee" />
                    <Gauge value={metrics.f1} label="F1 Score" color="#f59e0b" />
                    <Gauge value={metrics.accuracy} label="Accuracy" color="#34d399" />
                  </div>
                ) : (
                  <div style={{ color: darkMode ? "#334155" : "#94a3b8", textAlign: "center", paddingTop: 40 }}>
                    Run agent to see metrics
                  </div>
                )}
                {metrics && (
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                    gap: 12, marginTop: 28, paddingTop: 20, borderTop: "1px solid #1e293b",
                  }}>
                    {[
                      { l: "True Positives", v: metrics.tp, c: "#34d399" },
                      { l: "False Positives", v: metrics.fp, c: "#f87171" },
                      { l: "False Negatives", v: metrics.fn, c: "#fb923c" },
                      { l: "True Negatives", v: metrics.tn, c: "#818cf8" },
                    ].map(m => (
                      <div key={m.l} style={{ textAlign: "center" }}>
                        <div style={{ fontSize: 22, fontWeight: 800, color: m.c }}>{m.v}</div>
                        <div style={{ fontSize: 10, color: "#475569", marginTop: 2 }}>{m.l}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Confusion Matrix */}
              <div style={{
                background: darkMode ? "#0f172a" : "#f1f5f9", border: "1px solid #1e293b", borderRadius: 12, padding: 24,
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
                      <div style={{
                        background: darkMode ? "#14532d55" : "#d1fae5", border: darkMode ? "1px solid #22c55e44" : "1px solid #16a34a",
                        borderRadius: 8, padding: "20px 0", textAlign: "center",
                      }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: darkMode ? "#34d399" : "#166534" }}>{metrics.tp}</div>
                        <div style={{ fontSize: 10, color: darkMode ? "#16a34a" : "#166534" }}>True Positive</div>
                      </div>
                      <div style={{
                        background: darkMode ? "#7f1d1d55" : "#fee2e2", border: darkMode ? "1px solid #ef444444" : "1px solid #dc2626",
                        borderRadius: 8, padding: "20px 0", textAlign: "center",
                      }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: darkMode ? "#f87171" : "#b91c1c" }}>{metrics.fn}</div>
                        <div style={{ fontSize: 10, color: darkMode ? "#dc2626" : "#b91c1c" }}>False Negative</div>
                      </div>
                      <div style={{ color: "#64748b", display: "flex", alignItems: "center" }}>Actual: LEGIT</div>
                      <div style={{
                        background: darkMode ? "#7f1d1d55" : "#fee2e2", border: darkMode ? "1px solid #ef444444" : "1px solid #dc2626",
                        borderRadius: 8, padding: "20px 0", textAlign: "center",
                      }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: darkMode ? "#f87171" : "#b91c1c" }}>{metrics.fp}</div>
                        <div style={{ fontSize: 10, color: darkMode ? "#dc2626" : "#b91c1c" }}>False Positive</div>
                      </div>
                      <div style={{
                        background: darkMode ? "#1e1b4b55" : "#dbeafe", border: darkMode ? "1px solid #6366f144" : "1px solid #2563eb",
                        borderRadius: 8, padding: "20px 0", textAlign: "center",
                      }}>
                        <div style={{ fontSize: 28, fontWeight: 800, color: darkMode ? "#818cf8" : "#1e40af" }}>{metrics.tn}</div>
                        <div style={{ fontSize: 10, color: darkMode ? "#6366f1" : "#1e40af" }}>True Negative</div>
                      </div>
                    </div>
                    <div style={{
                      marginTop: 20, padding: 14, background: darkMode ? "#1e293b" : "#f8fafc", borderRadius: 8,
                      fontSize: 12, color: darkMode ? "#94a3b8" : "#475569", lineHeight: 1.7,
                    }}>
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
        )}

        {/* ENHANCED TRANSACTIONS TAB */}
        {activeTab === "transactions" && (
          <div>
            {/* Search and Filter Bar */}
            <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center" }}>
              <div style={{ position: "relative", flex: 1, maxWidth: 400 }}>
                <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: darkMode ? "#64748b" : "#94a3b8" }} />
                <input
                  type="text"
                  placeholder="Search by ID, merchant, or country..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 12px 8px 40px", borderRadius: 8,
                    background: darkMode ? "#0f172a" : "#fff",
                    border: darkMode ? "1px solid #1e293b" : "1px solid #e2e8f0",
                    color: darkMode ? "#e2e8f0" : "#1e293b", fontSize: 12,
                  }}
                />
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {[
                  { id: "all", label: `All (${transactions.filter(t => t.status === "done").length})`, color: "#818cf8" },
                  { id: "fraud", label: `Fraud (${fraudTxns.length})`, color: "#f87171" },
                  { id: "clear", label: `Clear (${clearTxns.length})`, color: "#34d399" },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilterType(f.id)}
                    style={{
                      padding: "6px 14px", borderRadius: 6, border: `1px solid ${f.color}33`,
                      color: filterType === f.id ? "#fff" : f.color, fontSize: 12, cursor: "pointer",
                      background: filterType === f.id ? f.color : "transparent",
                      transition: "all 0.2s",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Results Summary */}
            <div style={{ marginBottom: 12, fontSize: 12, color: darkMode ? "#64748b" : "#475569" }}>
              Showing {filteredTransactions.length} of {transactions.filter(t => t.status === "done").length} transactions
              {searchQuery && ` matching "${searchQuery}"`}
            </div>
            <div style={{
              background: darkMode ? "#0f172a" : "#fff",
              border: darkMode ? "1px solid #1e293b" : "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden",
              maxHeight: "calc(100vh - 340px)", overflowY: "auto",
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, background: darkMode ? "#1e293b" : "#f1f5f9" }}>
                  <tr>
                    {["ID", "Merchant", "Amount", "Hour", "Country", "Gap", "Score", "Status", "Correct?"].map(h => (
                      <th key={h} style={{
                        padding: "10px 16px", textAlign: "left", fontSize: 10,
                        color: darkMode ? "#475569" : "#64748b", letterSpacing: "0.08em", fontWeight: 600,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.slice().reverse().map(t => {
                    const correct = t.flaggedAsFraud === t.isActualFraud;
                    return (
                      <tr key={t.id} style={{
                        borderTop: darkMode ? "1px solid #1e293b" : "1px solid #f1f5f9",
                        background: t.flaggedAsFraud ? (darkMode ? "#7f1d1d0a" : "#fef2f2") : "transparent",
                      }}>
                        <td style={{ padding: "8px 16px", fontSize: 11, color: darkMode ? "#64748b" : "#475569" }}>{t.id}</td>
                        <td style={{ padding: "8px 16px", fontSize: 12, color: darkMode ? "#e2e8f0" : "#1e293b" }}>{t.merchant}</td>
                        <td style={{ padding: "8px 16px", fontSize: 12, color: t.amount > 500 ? "#fb923c" : (darkMode ? "#e2e8f0" : "#1e293b"), fontWeight: t.amount > 500 ? 700 : 400 }}>
                          ${t.amount.toFixed(2)}
                        </td>
                        <td style={{ padding: "8px 16px", fontSize: 12, color: t.hour <= 4 ? "#f87171" : (darkMode ? "#94a3b8" : "#64748b") }}>
                          {t.hour}:00
                        </td>
                        <td style={{ padding: "8px 16px", fontSize: 12, color: !["US","UK","CA"].includes(t.country) ? "#f87171" : (darkMode ? "#94a3b8" : "#64748b") }}>
                          {t.country}
                        </td>
                        <td style={{ padding: "8px 16px", fontSize: 12, color: t.prevTxnGap < 5 ? "#f87171" : (darkMode ? "#94a3b8" : "#64748b") }}>
                          {t.prevTxnGap}m
                        </td>
                        <td style={{ padding: "8px 16px" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <div style={{
                              height: 4, width: 60, background: darkMode ? "#1e293b" : "#e2e8f0", borderRadius: 2, overflow: "hidden",
                            }}>
                              <div style={{
                                height: "100%", width: t.score + '%',
                                background: t.score >= 50 ? "#f87171" : "#6366f1",
                                borderRadius: 2,
                              }} />
                            </div>
                            <span style={{ fontSize: 11, color: t.score >= 50 ? "#f87171" : "#818cf8" }}>{t.score}</span>
                          </div>
                        </td>
                        <td style={{ padding: "8px 16px" }}>
                          <span style={{
                            fontSize: 10, padding: "2px 8px", borderRadius: 4,
                            background: t.flaggedAsFraud ? "#7f1d1d" : "#14532d",
                            color: t.flaggedAsFraud ? "#f87171" : "#34d399",
                          }}>
                            {t.flaggedAsFraud ? "⚠ FRAUD" : "✓ CLEAR"}
                          </span>
                        </td>
                        <td style={{ padding: "8px 16px", fontSize: 16 }}>
                          {correct ? "✅" : "❌"}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ padding: 40, textAlign: "center", color: darkMode ? "#334155" : "#94a3b8" }}>
                        {searchQuery ? "No transactions found matching your search" : "No transactions processed yet"}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ENHANCED AGENT LOG TAB */}
        {activeTab === "agent log" && (
          <div style={{
            background: darkMode ? "#050a14" : "#f8fafc",
            border: darkMode ? "1px solid #1e293b" : "1px solid #e2e8f0", borderRadius: 12,
            padding: 20, height: "calc(100vh - 300px)", overflowY: "auto",
          }} ref={logRef}>
            <div style={{ marginBottom: 12, fontSize: 11, color: darkMode ? "#334155" : "#64748b", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 8 }}>
              <Activity style={{ width: 12, height: 12 }} />
              ── AGENT STDOUT ─────────────────────────────────────────────────
            </div>
            {logs.map((line, i) => <LogLine key={i} line={line} darkMode={darkMode} />)}
            {running && (
              <div style={{ color: "#6366f1", fontFamily: "monospace", fontSize: 12, marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
                <Activity style={{ width: 12, height: 12 }} />
                Processing...
              </div>
            )}
          </div>
        )}
      </div>

      {/* Styles removed due to parse issues */}
    </div>
  );
}
