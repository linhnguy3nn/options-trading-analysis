# Optionsflow
> Detect unusual options activity, identify straddles and directional flow, and volatility regime.


## What It Does
- Given a ticker, the system:
- Fetches the nearest expiry options chain
- Calculates Volume / Open Interest ratio (Vol/OI)
- Detects potential unusual activity
- Identifies possible straddle positioning
- Calculates Put/Call ratio
- Computes Realized Volatility Rank (1-year lookback)
- Estimates an expected move using ATM straddle pricing
- Classifies a final bias: bullish/bearish/neutral/volatility_play

There is no backtest included in this version.

---
## Core assumption: 
This model makes an assumption:
High Volume / Open Interest ratio -> New position opening -> Directional bet

*In reality:
- We do not know if trades are part of spreads.
- We do not know dealer hedging behavior.
## Project structure

```
options-flow-analyzer/
│
├── backend/
│   ├── Analyzer.py        # Core options analysis logic
│   ├── main.py           # FastAPI server
│   └── requirements.txt
│
└── frontend/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        └── App.jsx
```
---
## Quick Start
### Backend

```bash
cd backend
pip install -r requirements.txt

# Run as script (CLI output)
python Analyzer.py

# Run as API server
uvicorn main:app --reload
# → API available at http://localhost:8000
# → Docs at http://localhost:8000/docs
```

**API Example:**
```bash
curl http://localhost:8000/analyze/NVDA
```

```json
{
  "ticker": "NVDA",
  "expiry": "2025-03-21",
  "spot_price": 875.4,
  "flow_signal": "bullish",
  "sentiment_signal": "neutral",
  "put_call_ratio": 0.62,
  "rv_rank": 72.3,
  "vol_regime": "high",
  "expected_move": {"lower": 850.2, "upper": 900.6},
  "top_calls": [...],
  "top_puts": [...],
  "straddles": [],
  "final_bias": "bullish",
  "unusual_activity": {"call_score": 1500.0, "put_score": 200.0},
  "error": null
}
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```
---
## Signal logic explained:
1. Volume / Open Interest Ratio (Vol/OI)
- Volume = contracts traded today
- Open Interest = contracts already open
- If Vol/OI > 2, then theres high probability of unusually high activity relative to existing positions.
2. Put/Call Ratio (PCR) = Total Put Volume / Total Call Volume
- PCR < 0.8 | Call-heavy flow -> bullish sentiment, market positioning long 
- PCR > 1.2 | Put-heavy flow -> bearish sentiment, hedging or directional short 
- otherwise | Neutral, no clear directional bias 
3. Realized Volatility Rank (RV Rank)
I calculate 30-day historical volatility over the past year, then compute RV Rank = position of current volatility within 1-year range
  - RV rank > 70 | High volatility 
  - RV rank < 40 | Low volatility 
  - else | Medium 
This tells us whether options are relatively expensive or cheap compared to recent history
4. Expected move = (ATM Call Price + ATM Put Price) * 0.85 -> This gives an estimated price range for the current expiry
5. Straddle detection
A straddle occurs when both call and put at the same strike, both have high volume, volume is roughly balanced
This suggests: Traders expect a large move but direction is unclear
If detected -> final_bias = volatility_play
Final bias logic: If straddle detected -> volatility_play, otherwise: score = flow_bias + sentiment_bias, which if score >=1 -> bullish, if score <=-1 -> bearish, else -> neutral
-------
## Key terms:
1. `Option`
A financial contract that gives the right (not obligation) to buy or sell a stock at a specific price before expiration.
2. `Call Option`
A contract that benefits if the stock price rises.
3. `Put Option`
A contract that benefits if the stock price falls.
4. `Open Interest`
The number of contracts currently open in the market.
5. `Volume`
The number of contracts traded today.
6. `Straddle`
Buying both a call and a put at the same strike and expiration. This is a bet on movement, a way to hedge, not direction.
7. `Realized Volatility`
How much the stock actually moved in the past.
8. `Implied Volatility`
How much the market expects the stock to move in the future.
(This project does not deeply analyze IV skew or surface.)


---

## Disclaimer

This project is for **educational purposes only**. Nothing here constitutes financial advice. Options trading involves substantial risk of loss.

---

## License

MIT — free to use, modify, and distribute. Attribution appreciated.
