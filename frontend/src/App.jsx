import { useState, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

const API_BASE = "http://localhost:8000";

const SIGNAL_COLORS = {
  bullish:         { color: "#20cc9e", icon: "▲", label: "BULLISH" },
  bearish:         { color: "#f9153b", icon: "▼", label: "BEARISH" },
  neutral:         { color: "#849ab9", icon: "●", label: "NEUTRAL" },
  volatility_play: { color: "#f59e0b", icon: "◆", label: "VOL PLAY" },
};

const fmt    = (n, d = 2) => (typeof n === "number" ? n.toFixed(d) : "—");
const fmtPct = (n)        => (typeof n === "number" ? (n * 100).toFixed(1) + "%" : "—");
const fmtK   = (n)        => (!n ? "—" : n >= 1000 ? (n / 1000).toFixed(1) + "K" : n);

async function fetchAnalysis(ticker) {
  const res = await fetch(`${API_BASE}/analyze/${ticker}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Unknown error");
  }
  return res.json();
}

function SignalBadge({ signal, label }) {
  const cfg = SIGNAL_COLORS[signal] || SIGNAL_COLORS.neutral;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      background: cfg.color + "18", border: `1px solid ${cfg.color}44`,
      borderRadius: "6px", padding: "4px 12px",
      color: cfg.color, fontFamily: "monospace", fontSize: "12px", fontWeight: 700,
    }}>
      {cfg.icon} {label || cfg.label}
    </span>
  );
}

function StatCard({ label, value, accent, sub }) {
  return (
    <div style={{
      background: "#0d1117", border: "1px solid #1e2732",
      borderRadius: "8px", padding: "14px 18px", flex: 1, minWidth: "130px",
    }}>
      <div style={{ color: "#4a5568", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace" }}>
        {label}
      </div>
      <div style={{ color: accent || "#e2e8f0", fontSize: "22px", fontWeight: 700, fontFamily: "monospace", margin: "6px 0 2px" }}>
        {value}
      </div>
      {sub && <div style={{ color: "#4a5568", fontSize: "11px" }}>{sub}</div>}
    </div>
  );
}

function OptionsTable({ title, rows, color }) {
  return (
    <div style={{ flex: 1, minWidth: "260px" }}>
      <div style={{ color, fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.1em", fontWeight: 700, marginBottom: "10px" }}>
        {title}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
        <thead>
          <tr>
            {["Strike", "Vol", "OI", "V/OI", "IV"].map((h) => (
              <th key={h} style={{ color: "#4a5568", textAlign: "right", padding: "4px 6px", fontWeight: 400, fontFamily: "monospace" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: "1px solid #1a1f2e" }}>
              <td style={{ padding: "7px 6px", color: "#e2e8f0", fontFamily: "monospace", textAlign: "right" }}>{r.strike}</td>
              <td style={{ padding: "7px 6px", color, fontFamily: "monospace", textAlign: "right", fontWeight: 700 }}>{fmtK(r.volume)}</td>
              <td style={{ padding: "7px 6px", color: "#64748b", fontFamily: "monospace", textAlign: "right" }}>{fmtK(r.openInterest)}</td>
              <td style={{ padding: "7px 6px", color: "#94a3b8", fontFamily: "monospace", textAlign: "right" }}>{fmt(r.vol_oi_ratio)}</td>
              <td style={{ padding: "7px 6px", color: "#94a3b8", fontFamily: "monospace", textAlign: "right" }}>{fmtPct(r.impliedVolatility)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function VolumeChart({ calls, puts, spot }) {
  const data = [
    ...calls.map((c) => ({ strike: c.strike, volume: c.volume, type: "call" })),
    ...puts.map((p)  => ({ strike: p.strike, volume: p.volume, type: "put"  })),
  ].sort((a, b) => a.strike - b.strike);

  return (
    <div style={{ background: "#0d1117", border: "1px solid #1e2732", borderRadius: "8px", padding: "18px" }}>
      <div style={{ color: "#4a5568", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "monospace", marginBottom: "14px" }}>
        ▸ Volume by Strike
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data}>
          <XAxis dataKey="strike" tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "monospace" }} />
          <YAxis tick={{ fill: "#4a5568", fontSize: 9, fontFamily: "monospace" }} />
          <Tooltip
            contentStyle={{ background: "#0d1117", border: "1px solid #1e2732", borderRadius: "6px", fontFamily: "monospace", fontSize: "11px" }}
            cursor={{ fill: "rgba(255,255,255,0.02)" }}
          />
          <ReferenceLine x={spot} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "spot", fill: "#f59e0b", fontSize: 9 }} />
          <Bar dataKey="volume" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.type === "call" ? "#22d3a5" : "#f43f5e"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: "16px", marginTop: "8px" }}>
        {[["#22d3a5", "Calls"], ["#f43f5e", "Puts"], ["#f59e0b", "Spot"]].map(([c, l]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "10px", color: "#4a5568" }}>
            <div style={{ width: "8px", height: "8px", background: c, borderRadius: "2px" }} /> {l}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [input, setInput]     = useState("NVDA");
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleAnalyze = useCallback(async (sym) => {
    const ticker = (sym || input).trim().toUpperCase();
    if (!ticker) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const result = await fetchAnalysis(ticker);
      setData(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [input]);

  return (
    <div style={{ minHeight: "100vh", background: "#060a0f", color: "#e2e8f0", fontFamily: "Inter, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        button { cursor: pointer; transition: opacity 0.15s; }
        button:hover { opacity: 0.8; }
        .qticker { background: transparent; border: 1px solid #1e2732; border-radius: 6px; color: #64748b; padding: 5px 11px; font-size: 11px; font-family: monospace; }
        .qticker:hover { border-color: #22d3a5; color: #22d3a5; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e2732", padding: "18px 36px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "16px", color: "#22d3a5" }}>⬡ OPTFLOW</span>
          <span style={{ color: "#4a5568", fontSize: "11px", marginLeft: "12px" }}>Options Flow Intelligence</span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            placeholder="TICKER"
            maxLength={10}
            style={{
              background: "#0d1117", border: "1px solid #1e2732", borderRadius: "6px",
              color: "#e2e8f0", padding: "9px 14px", fontFamily: "monospace", fontSize: "13px",
              width: "130px", outline: "none",
            }}
          />
          <button
            onClick={() => handleAnalyze()}
            style={{ background: "#22d3a5", border: "none", borderRadius: "6px", color: "#060a0f", padding: "9px 18px", fontFamily: "monospace", fontSize: "12px", fontWeight: 700 }}
          >
            ANALYZE
          </button>
        </div>
      </div>

      <div style={{ padding: "28px 36px", maxWidth: "1080px", margin: "0 auto" }}>
        {/* Quick tickers */}
        <div style={{ display: "flex", gap: "7px", marginBottom: "28px", flexWrap: "wrap" }}>
          {["NVDA", "AAPL", "TSLA", "SPY", "AMD", "META", "QQQ"].map((t) => (
            <button key={t} className="qticker" onClick={() => { setInput(t); handleAnalyze(t); }}>{t}</button>
          ))}
        </div>

        {/* Empty state */}
        {!data && !loading && !error && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#1e2732" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>⬡</div>
            <div style={{ fontFamily: "monospace", fontSize: "13px" }}>Enter a ticker to analyze options flow</div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ color: "#22d3a5", fontFamily: "monospace", fontSize: "13px", letterSpacing: "0.1em" }}>
              FETCHING OPTIONS DATA...
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ color: "#f43f5e", fontFamily: "monospace", fontSize: "12px", padding: "16px", background: "rgba(244,63,94,0.05)", border: "1px solid rgba(244,63,94,0.2)", borderRadius: "8px" }}>
            ✕ {error}
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>

            {/* Ticker header */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "30px" }}>{data.ticker}</div>
                <div style={{ color: "#4a5568", fontSize: "11px", marginTop: "3px" }}>
                  Expiry: {data.expiry} &nbsp;·&nbsp; Spot: ${fmt(data.spot_price)}
                </div>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <SignalBadge signal={data.flow_signal}      label={`FLOW: ${data.flow_signal?.toUpperCase()}`} />
                <SignalBadge signal={data.sentiment_signal} label={`PCR: ${data.sentiment_signal?.toUpperCase()}`} />
                <SignalBadge signal={data.final_bias}       label={`BIAS: ${data.final_bias?.toUpperCase()}`} />
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <StatCard
                label="Put/Call Ratio"
                value={fmt(data.put_call_ratio)}
                accent={data.put_call_ratio < 0.8 ? "#22d3a5" : data.put_call_ratio > 1.2 ? "#f43f5e" : "#94a3b8"}
                sub={data.put_call_ratio < 0.8 ? "Call-heavy" : data.put_call_ratio > 1.2 ? "Put-heavy" : "Balanced"}
              />
              <StatCard
                label="RV Rank"
                value={`${fmt(data.rv_rank, 1)}%`}
                accent={data.rv_rank > 70 ? "#f43f5e" : data.rv_rank < 40 ? "#22d3a5" : "#94a3b8"}
                sub={`Regime: ${data.vol_regime}`}
              />
              <StatCard
                label="Expected Move"
                value={`±$${fmt(data.spot_price - data.expected_move?.lower)}`}
                sub={`$${fmt(data.expected_move?.lower)} – $${fmt(data.expected_move?.upper)}`}
              />
              <StatCard
                label="Unusual Activity"
                value={data.unusual_activity?.call_score > data.unusual_activity?.put_score ? "↑ Calls" : "↓ Puts"}
                accent={data.unusual_activity?.call_score > data.unusual_activity?.put_score ? "#22d3a5" : "#f43f5e"}
                sub={`C:${fmtK(data.unusual_activity?.call_score)} P:${fmtK(data.unusual_activity?.put_score)}`}
              />
            </div>

            {/* Volume chart */}
            <VolumeChart calls={data.top_calls} puts={data.top_puts} spot={data.spot_price} />

            {/* Options tables */}
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", background: "#0d1117", border: "1px solid #1e2732", borderRadius: "8px", padding: "18px" }}>
              <OptionsTable title="▲ TOP CALLS" rows={data.top_calls} color="#22d3a5" />
              <div style={{ width: "1px", background: "#1e2732" }} />
              <OptionsTable title="▼ TOP PUTS"  rows={data.top_puts}  color="#f43f5e" />
            </div>

            {/* Straddles */}
            {data.straddles?.length > 0 && (
              <div style={{ background: "#0d1117", border: "1px solid rgba(245,158,11,0.3)", borderRadius: "8px", padding: "18px" }}>
                <div style={{ color: "#f59e0b", fontSize: "10px", letterSpacing: "0.1em", fontFamily: "monospace", fontWeight: 700, marginBottom: "12px" }}>
                  ◆ STRADDLE SIGNALS DETECTED ({data.straddles.length})
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                  <thead>
                    <tr>
                      {["Strike", "Call Vol", "Put Vol", "Call V/OI", "Put V/OI"].map((h) => (
                        <th key={h} style={{ color: "#4a5568", textAlign: "right", padding: "4px 8px", fontWeight: 400, fontFamily: "monospace" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {data.straddles.map((s, i) => (
                      <tr key={i} style={{ borderTop: "1px solid #1a1f2e" }}>
                        <td style={{ padding: "8px", color: "#f59e0b", fontFamily: "monospace", textAlign: "right", fontWeight: 700 }}>{s.strike}</td>
                        <td style={{ padding: "8px", color: "#22d3a5", fontFamily: "monospace", textAlign: "right" }}>{fmtK(s.volume_call)}</td>
                        <td style={{ padding: "8px", color: "#f43f5e", fontFamily: "monospace", textAlign: "right" }}>{fmtK(s.volume_put)}</td>
                        <td style={{ padding: "8px", color: "#94a3b8", fontFamily: "monospace", textAlign: "right" }}>{fmt(s.vol_oi_ratio_call)}</td>
                        <td style={{ padding: "8px", color: "#94a3b8", fontFamily: "monospace", textAlign: "right" }}>{fmt(s.vol_oi_ratio_put)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ color: "#2d3748", fontSize: "10px", textAlign: "center", fontFamily: "monospace" }}>
              Data via yfinance · Not financial advice · Educational use only
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
