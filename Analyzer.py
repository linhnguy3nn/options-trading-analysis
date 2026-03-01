# import yfinance as yf
# tk = yf.Ticker("AAPL")
# tk.options
# # print(tk.options)
# exp = tk.options[0]
# # print(exp)
# opts = tk.option_chain(exp)
# print(opts)
import yfinance as yf
import pandas as pd
import numpy as np

def analyze_strategies(ticker_symbol):
    result = {
      "ticker": ticker_symbol.upper(),
      "expiry": None,
      "spot_price": 0.0,
      "flow_signal": 'neutral',
      "sentiment_signal": 'neutral',
      "put_call_ratio": 0.0,
      "rv_rank": 0.0,
      "vol_regime": 'medium',
      "straddles": [],
      "expected_move": {'lower': 0.0, 'upper': 0.0},
      'top_calls': [],
      'top_puts': [],
      'unusual_activity': {'call_score': 0, 'put_score': 0},
      'final_bias': 'neutral',
      'error': None}
    try:
      tk = yf.Ticker(ticker_symbol)
      if not tk.options:
        result['error'] = f'No data found for {ticker_symbol}'
        return result

      exp = tk.options[0]
      opts = tk.option_chain(exp)
      hist_1y = tk.history(period="1y")
      if hist_1y.empty:
        result['error'] = f'No data found for {ticker_symbol}'
        return result

      spot_price = float(hist_1y["Close"].iloc[-1])
      result['expiry'] = exp
      result['spot_price'] = round(spot_price, 2)

      calls = opts.calls[['strike', 'volume', 'openInterest', 'impliedVolatility', 'lastPrice']].fillna(0)
      puts = opts.puts[['strike', 'volume', 'openInterest', 'impliedVolatility', 'lastPrice']].fillna(0)
      # (1)
      calls['vol_oi_ratio'] = calls['volume'] / calls['openInterest'].replace(0, 1)
      puts['vol_oi_ratio'] = puts['volume'] / puts['openInterest'].replace(0, 1)

      flow_bias = 1 if (calls['vol_oi_ratio'] > 2).sum() > (puts['vol_oi_ratio'] > 2).sum() else -1
      result["flow_signal"] = 'bullish' if flow_bias > 0 else 'bearish' if flow_bias < 0 else 'neutral'


      # (2)
      put_call_ratio = puts['volume'].sum() / max(calls['volume'].sum(), 1)
      result['put_call_ratio'] = round(put_call_ratio, 2)
      sentiment_bias = 1 if put_call_ratio < 0.8 else -1 if put_call_ratio > 1.2 else 0
      result["sentiment_signal"] = 'bullish' if sentiment_bias == 1 else 'bearish' if sentiment_bias == -1 else 'neutral'


      # (3)
      top_calls = calls.sort_values(by='volume', ascending=False).head(3)
      top_puts = puts.sort_values(by='volume', ascending=False).head(3)
      result["top_calls"] = top_calls.to_dict("records")
      result["top_puts"] = top_puts.to_dict("records")

      call_score = top_calls[(top_calls['vol_oi_ratio'] > 5) & (top_calls['strike'] > spot_price)]['volume'].sum()
      put_score = top_puts[(top_puts['vol_oi_ratio'] > 5) & (top_puts['strike'] < spot_price)]['volume'].sum()
      result['unusual_activity'] = {'call_score': float(call_score), 'put_score': float(put_score)}


      # (4)
      hist_1y["returns"] = hist_1y["Close"].pct_change()
      hist_1y["rv_30"] = (hist_1y["returns"].rolling(30).std() * np.sqrt(252))
      rv_series = hist_1y["rv_30"].dropna()

      if not rv_series.empty:
        curr_rv = rv_series.iloc[-1]
        rv_min, rv_max = rv_series.min(), rv_series.max()
        rv_rank = (curr_rv - rv_min) / (rv_max - rv_min) * 100 if rv_max > rv_min else 0
        result['rv_rank'] = round(rv_rank, 2)
        result['vol_regime'] = 'high' if rv_rank > 70 else 'low' if rv_rank < 40 else 'medium'


      # (5)
      atm_strike = calls.iloc[(calls['strike'] - spot_price).abs().argsort()[:1]]['strike'].values[0]
      call_atm = calls[calls['strike'] == atm_strike]['lastPrice'].values[0]
      put_atm = puts[puts['strike'] == atm_strike]['lastPrice'].values[0]
      
      expected_move = (call_atm + put_atm) * 0.85
      result["expected_move"] = {'lower': round(spot_price - expected_move, 2), 'upper': round(spot_price + expected_move, 2)}
      
      merged = pd.merge(calls, puts, on='strike', suffixes=('_call', '_put'))
      stradles_df = merged[
          (merged['volume_call'] > 50) &
          (merged['volume_put'] > 50) &
          (abs(merged['volume_call'] - merged['volume_put']) / merged['volume_call'].replace(0, 1) < 0.15)
      ]
      result["straddles"] = stradles_df.to_dict('records')

      total_score = flow_bias + sentiment_bias
      if not stradles_df.empty:
        result['final_bias'] = 'volatility_play'
      else:
        result['final_bias'] = 'bullish' if total_score >= 1 else 'bearish' if total_score <= -1 else 'neutral'

    except Exception as e:
      result['error'] = str(e)
      
    return result
    
