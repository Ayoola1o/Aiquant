import { useState } from 'react';
import { 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { 
  Play, 
  AlertTriangle
} from 'lucide-react';

interface BacktesterProps {
  strategies: Array<{ id: string; name: string; code: string }>;
  selectedStrategyId: string;
  alpacaKeyId?: string;
  alpacaSecretKey?: string;
}

const FEED_SYMBOLS: Record<string, { value: string; label: string }[]> = {
  binance: [
    { value: 'BTCUSDT', label: 'BTC/USDT' },
    { value: 'ETHUSDT', label: 'ETH/USDT' },
    { value: 'SOLUSDT', label: 'SOL/USDT' },
    { value: 'ADAUSDT', label: 'ADA/USDT' },
  ],
  yfinance: [
    { value: 'AAPL', label: 'AAPL (Apple)' },
    { value: 'MSFT', label: 'MSFT (Microsoft)' },
    { value: 'TSLA', label: 'TSLA (Tesla)' },
    { value: 'NVDA', label: 'NVDA (NVIDIA)' },
    { value: 'BTC-USD', label: 'BTC-USD (Bitcoin)' },
    { value: 'ETH-USD', label: 'ETH-USD (Ethereum)' },
  ],
  alpaca: [
    { value: 'AAPL', label: 'AAPL (Apple)' },
    { value: 'MSFT', label: 'MSFT (Microsoft)' },
    { value: 'TSLA', label: 'TSLA (Tesla)' },
    { value: 'NVDA', label: 'NVDA (NVIDIA)' },
    { value: 'BTCUSD', label: 'BTCUSD (Bitcoin)' },
    { value: 'ETHUSD', label: 'ETHUSD (Ethereum)' },
  ]
};

export default function Backtester({ 
  strategies, 
  selectedStrategyId, 
  alpacaKeyId = '', 
  alpacaSecretKey = '' 
}: BacktesterProps) {
  // Filter Metrics states
  const [exchange, setExchange] = useState('yfinance');
  const [tradingPeriod, setTradingPeriod] = useState('2y');
  const [customStartDate, setCustomStartDate] = useState('2020-01-01');
  const [customEndDate, setCustomEndDate] = useState('2023-01-01');
  const [symbol, setSymbol] = useState('BTC-USD');
  const [customTicker, setCustomTicker] = useState('EURUSD=X');
  const [timeframe, setTimeframe] = useState('15m');
  const [activeId, setActiveId] = useState(selectedStrategyId);

  // Realistic Execution Controls
  const [slippagePct, setSlippagePct] = useState(0.05); // 0.05%
  const [spreadPct, setSpreadPct] = useState(0.02);   // 0.02%

  // Chart Tab State
  const [activeChartTab, setActiveChartTab] = useState<'equity' | 'drawdown' | 'rolling_sharpe' | 'monthly' | 'trade_dist' | 'montecarlo'>('equity');

  const handleExchangeChange = (newExchange: string) => {
    setExchange(newExchange);
    const options = FEED_SYMBOLS[newExchange] || [];
    if (options.length > 0) {
      setSymbol(options[0].value);
    } else {
      setSymbol('custom');
    }
  };
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [kpis, setKpis] = useState<any>(null);
  const [equityCurve, setEquityCurve] = useState<any[]>([]);
  const [drawdownCurve, setDrawdownCurve] = useState<any[]>([]);
  const [rollingSharpeCurve, setRollingSharpeCurve] = useState<any[]>([]);
  const [monthlyReturnsData, setMonthlyReturnsData] = useState<any[]>([]);
  const [tradeDistData, setTradeDistData] = useState<any[]>([]);
  const [monteCarloData, setMonteCarloData] = useState<any>(null);
  const [loadingMonteCarlo, setLoadingMonteCarlo] = useState(false);
  const [backtestLogs, setBacktestLogs] = useState<string[]>([]);

  // Default built-in strategy script in case Strategy Lab is empty
  const defaultStrategy = `class CustomStrategy(BaseStrategy):
    def __init__(self, parameters=None):
        super().__init__(parameters)
        self.sma_period = 20
        
    def on_candle(self, candle, state):
        close = candle['close']
        sma = candle.get('sma', close)
        active_position = sum(state['positions'].values())
        
        if close > sma and state['cash'] > 100:
            qty = (state['cash'] * 0.95) / close
            return {"action": "BUY", "qty": round(qty, 4), "type": "MARKET"}
        elif close < sma and active_position > 0:
            return {"action": "SELL", "qty": active_position, "type": "MARKET"}
            
        return None`;

  const runMonteCarloSimulation = async (tradePnls: number[]) => {
    if (!tradePnls || tradePnls.length === 0) return;
    setLoadingMonteCarlo(true);
    try {
      const res = await fetch('http://localhost:8000/api/backtest/montecarlo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trade_pnls: tradePnls,
          starting_capital: 10000.0,
          n_paths: 1000
        })
      });
      if (res.ok) {
        const mcRes = await res.json();
        if (mcRes.success) {
          setMonteCarloData(mcRes);
        }
      }
    } catch (e) {
      console.error('Failed to run Monte Carlo simulation:', e);
    } finally {
      setLoadingMonteCarlo(false);
    }
  };

  const handleRunBacktest = async (_initialRun = false) => {
    setLoading(true);
    setError('');
    
    let mappedSymbol = symbol === 'custom' ? customTicker : symbol;
    let mappedPeriod = tradingPeriod;
    if (tradingPeriod === 'custom') {
      mappedPeriod = `${customStartDate}_${customEndDate}`;
    }

    try {
      const res = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategy_code: strategies.find(s => s.id === activeId)?.code || defaultStrategy,
          ticker: mappedSymbol,
          period: mappedPeriod,
          interval: timeframe,
          starting_capital: 10000.0,
          commission_pct: 0.001,
          slippage_pct: slippagePct / 100.0,
          spread_pct: spreadPct / 100.0,
          alpaca_key_id: alpacaKeyId,
          alpaca_secret_key: alpacaSecretKey,
          exchange: exchange
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setKpis(data.kpis);
          setEquityCurve(data.equity_curve || []);
          setDrawdownCurve(data.drawdown_curve || []);
          setRollingSharpeCurve(data.rolling_sharpe || []);
          setMonthlyReturnsData(data.monthly_returns || []);
          setTradeDistData(data.trade_distribution || []);

          // Extract realized PnLs for Monte Carlo
          const realizedPnls = (data.trade_logs || [])
            .filter((t: any) => t.action === 'SELL')
            .map((t: any) => t.pnl);

          if (realizedPnls.length >= 3) {
            runMonteCarloSimulation(realizedPnls);
          }
          
          // Assemble simulation logs
          const logsList: string[] = [];
          logsList.push(`[System] Initializing backtest simulation...`);
          logsList.push(`[System] Symbol: ${mappedSymbol.toUpperCase()}`);
          logsList.push(`[System] Slippage Model: ${slippagePct}% | Spread Model: ${spreadPct}%`);
          logsList.push(`[System] Timeframe: ${timeframe}`);
          logsList.push(`[System] Data fetched successfully. Total bars: ${data.equity_curve.length}`);
          logsList.push(`[System] Running strategy simulation...`);
          
          if (data.trade_logs && data.trade_logs.length > 0) {
            data.trade_logs.forEach((t: any) => {
              const pnlText = t.action === 'SELL' ? ` | PnL: $${t.pnl.toFixed(2)} (${t.pnl_pct.toFixed(2)}%)` : '';
              logsList.push(`[Simulation] ${t.timestamp} - Executed ${t.action} ${t.qty} @ $${t.price.toFixed(2)} (Fee: $${t.fee.toFixed(2)}${pnlText})`);
            });
          } else {
            logsList.push(`[Simulation] No trades executed during this period.`);
          }
          
          logsList.push(`[System] Simulation completed.`);
          logsList.push(`[System] Final Portfolio Value: $${data.kpis.finishing_balance.toFixed(2)} (Total Return: ${data.kpis.pnl_pct.toFixed(2)}%)`);
          logsList.push(`[System] Sharpe: ${data.kpis.sharpe_ratio.toFixed(2)} | Profit Factor: ${data.kpis.profit_factor?.toFixed(2) || 'N/A'}`);
          
          setBacktestLogs(logsList);
        } else {
          setError(data.error || 'Backtest simulation failed.');
        }
      } else {
        setError('Server returned an error. Check backend logs.');
      }
    } catch (e) {
      setError(`Connection failed: ${e}`);
    } finally {
      setLoading(false);
    }
  };


  // No automatic run on mount, wait for user selection

  // Format date helper for chart labels
  const formatXAxis = (tickItem: string) => {
    try {
      const date = new Date(tickItem);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (date.getDate() <= 7) {
        return months[date.getMonth()];
      }
      return '';
    } catch {
      return tickItem;
    }
  };

  return (
    <div className="space-y-6 select-none text-[#E1E3E8] font-sans">

      
      {/* Top Metrics Section */}
      <div className="grid md:grid-cols-4 items-start gap-6 shrink-0">
        
        {/* Left Column: Filter Metrics */}
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg flex flex-col justify-between min-h-[360px] h-auto">
          <div>
            <h3 className="text-base font-extrabold text-white mb-2">Filter Metrics</h3>
            <p className="text-[10px] text-[#A1A5B0] font-light leading-relaxed mb-4">
              Select the info for the backtest metrics that you want to see:
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-[#A1A5B0] text-[9px] font-bold uppercase tracking-wider mb-1.5">Select Strategy</label>
                <select
                  value={activeId}
                  onChange={(e) => setActiveId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F1115] border border-white/5 rounded-lg text-xs font-semibold outline-none focus:border-[#4D88FF]/50 text-white"
                >
                  {strategies.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#A1A5B0] text-[9px] font-bold uppercase tracking-wider mb-1.5">Trading period</label>
                <select
                  value={tradingPeriod}
                  onChange={(e) => setTradingPeriod(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F1115] border border-white/5 rounded-lg text-xs font-semibold outline-none focus:border-[#4D88FF]/50 text-white"
                >
                  <option value="1y">1 Year (Past Year)</option>
                  <option value="2y">2 Years (Past 2 Years)</option>
                  <option value="5y">5 Years (Past 5 Years)</option>
                  <option value="10y">10 Years (Past 10 Years)</option>
                  <option value="max">Max History</option>
                  <option value="custom">Custom Date Range</option>
                </select>

                {tradingPeriod === 'custom' && (
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div>
                      <label className="block text-[#A1A5B0] text-[8px] font-bold uppercase tracking-wider mb-1">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-full px-2 py-1.5 bg-[#0F1115] border border-white/5 rounded text-xs font-semibold outline-none focus:border-[#4D88FF]/50 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[#A1A5B0] text-[8px] font-bold uppercase tracking-wider mb-1">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-full px-2 py-1.5 bg-[#0F1115] border border-white/5 rounded text-xs font-semibold outline-none focus:border-[#4D88FF]/50 text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[#A1A5B0] text-[9px] font-bold uppercase tracking-wider mb-1.5">Exchange Source</label>
                <select
                  value={exchange}
                  onChange={(e) => handleExchangeChange(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F1115] border border-white/5 rounded-lg text-xs font-semibold outline-none focus:border-[#4D88FF]/50 text-white"
                >
                  <option value="yfinance">Yahoo Finance</option>
                  <option value="alpaca">Alpaca Market Data</option>
                  <option value="binance">Binance public API</option>
                </select>
              </div>

              <div>
                <label className="block text-[#A1A5B0] text-[9px] font-bold uppercase tracking-wider mb-1.5">Symbol</label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F1115] border border-white/5 rounded-lg text-xs font-semibold outline-none focus:border-[#4D88FF]/50 text-white"
                >
                  {(FEED_SYMBOLS[exchange] || []).map((sym) => (
                    <option key={sym.value} value={sym.value}>{sym.label}</option>
                  ))}
                  <option value="custom">Custom Exchange Ticker</option>
                </select>

                {symbol === 'custom' && (
                  <div className="mt-3">
                    <label className="block text-[#A1A5B0] text-[8px] font-bold uppercase tracking-wider mb-1">Custom Ticker Suffix / Symbol</label>
                    <input
                      type="text"
                      value={customTicker}
                      onChange={(e) => setCustomTicker(e.target.value)}
                      placeholder="e.g. EURUSD=X or ^GSPC or BP.L"
                      className="w-full px-3 py-1.5 bg-[#0F1115] border border-white/5 rounded text-xs font-semibold outline-none focus:border-[#4D88FF]/50 text-white font-mono"
                    />
                    <p className="text-[8px] text-[#A1A5B0] mt-1 font-light leading-normal">
                      Suffixes: `=X` (Forex), `.L` (LSE London), `.DE` (Frankfurt), `.NS` (India), `^GSPC` (S&P Index)
                    </p>
                  </div>
                )}
              </div>

              {/* Realistic Execution Model Parameters */}
              <div className="p-2.5 rounded-lg bg-[#0F1115] border border-white/5">
                <label className="block text-cyan-400 text-[9px] font-bold uppercase tracking-wider mb-1.5">Execution Realism Model</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#A1A5B0] text-[8px] font-mono mb-1">Slippage %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={slippagePct}
                      onChange={(e) => setSlippagePct(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-[#1A1D24] border border-white/10 rounded text-xs font-semibold text-white font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#A1A5B0] text-[8px] font-mono mb-1">Half-Spread %</label>
                    <input
                      type="number"
                      step="0.01"
                      value={spreadPct}
                      onChange={(e) => setSpreadPct(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-[#1A1D24] border border-white/10 rounded text-xs font-semibold text-white font-mono outline-none"
                    />
                  </div>
                </div>
              </div>


              <div>
                <label className="block text-[#A1A5B0] text-[9px] font-bold uppercase tracking-wider mb-1.5">Timeframe</label>
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F1115] border border-white/5 rounded-lg text-xs font-semibold outline-none focus:border-[#4D88FF]/50 text-white"
                >
                  <option value="15m">15m</option>
                  <option value="1h">1h</option>
                  <option value="1d">1d</option>
                </select>
                {['15m', '1h'].includes(timeframe) && (
                  <p className="text-[9px] text-[#FFB300] mt-1.5 font-light leading-relaxed">
                    ⚠️ yfinance limits 15m/1h historical data to the last 730 days. Use `1d` for older dates.
                  </p>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={() => handleRunBacktest(false)}
            disabled={loading}
            className="w-full py-2.5 mt-4 bg-[#FFB300] hover:bg-[#e09d00] disabled:opacity-50 text-[#0F1115] font-extrabold text-xs rounded-lg shadow-lg flex items-center justify-center gap-1.5 transition-all duration-300 uppercase tracking-wider"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Run Strategy
          </button>
        </div>

        {/* Column 2: Performance Metrics */}
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg h-[360px] flex flex-col justify-between">
          <h3 className="text-xs font-bold text-[#A1A5B0] uppercase tracking-wider pb-2 border-b border-white/5">
            Performance Metrics
          </h3>
          <div className="flex-1 overflow-y-auto pt-3 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">PNL:</span>
              <span className={`font-bold font-mono ${kpis?.pnl >= 0 ? 'text-[#2EE59D]' : 'text-[#FF4B55]'}`}>
                {kpis ? `${kpis.pnl.toFixed(2)} (${kpis.pnl_pct.toFixed(2)}%)` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Win rate:</span>
              <span className="font-bold font-mono text-white">{kpis ? `${kpis.win_rate.toFixed(2)}%` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Sharpe ratio:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.sharpe_ratio.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Smart Sharpe:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.smart_sharpe.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Sortino ratio:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.sortino_ratio.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Smart Sortino:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.smart_sortino.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Calmar ratio:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.calmar_ratio.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Omega ratio:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.omega_ratio.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Serenity index:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.serenity_index.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Average win/loss:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.average_win_loss.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Average win:</span>
              <span className="font-bold font-mono text-[#2EE59D]">{kpis ? kpis.average_win.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Average loss:</span>
              <span className="font-bold font-mono text-[#FF4B55]">{kpis ? kpis.average_loss.toFixed(2) : '—'}</span>
            </div>
          </div>
        </div>

        {/* Column 3: Risk Metrics */}
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg h-[360px] flex flex-col justify-between">
          <h3 className="text-xs font-bold text-[#A1A5B0] uppercase tracking-wider pb-2 border-b border-white/5">
            Risk Metrics
          </h3>
          <div className="flex-1 overflow-y-auto pt-3 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Total losing streak:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.total_losing_streak : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Largest losing trade:</span>
              <span className="font-bold font-mono text-[#FF4B55]">{kpis ? kpis.largest_losing_trade.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Largest winning trade:</span>
              <span className="font-bold font-mono text-[#2EE59D]">{kpis ? kpis.largest_winning_trade.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Total winning streak:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.total_winning_streak : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Current streak:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.current_streak : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Expectancy:</span>
              <span className="font-bold font-mono text-white">
                {kpis ? `${kpis.expectancy.toFixed(2)} (${(kpis.expectancy / kpis.starting_balance * 100).toFixed(2)}%)` : '—'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Expected net profit:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.expected_net_profit.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Average holding period:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.average_holding_period.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Gross profit:</span>
              <span className="font-bold font-mono text-[#2EE59D]">{kpis ? kpis.gross_profit.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Gross loss:</span>
              <span className="font-bold font-mono text-[#FF4B55]">{kpis ? kpis.gross_loss.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Max drawdown:</span>
              <span className="font-bold font-mono text-[#FF4B55]">{kpis ? `-${kpis.max_drawdown_pct.toFixed(2)}%` : '—'}</span>
            </div>
          </div>
        </div>

        {/* Column 4: Trade Metrics */}
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-5 shadow-lg h-[360px] flex flex-col justify-between">
          <h3 className="text-xs font-bold text-[#A1A5B0] uppercase tracking-wider pb-2 border-b border-white/5">
            Trade Metrics
          </h3>
          <div className="flex-1 overflow-y-auto pt-3 space-y-2.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Total trades:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.total_trades : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Total winning trades:</span>
              <span className="font-bold font-mono text-[#2EE59D]">{kpis ? kpis.total_winning_trades : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Total losing trades:</span>
              <span className="font-bold font-mono text-[#FF4B55]">{kpis ? kpis.total_losing_trades : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Starting balance:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.starting_balance.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Finishing balance:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.finishing_balance.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Longs count:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.longs_count : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Longs percentage:</span>
              <span className="font-bold font-mono text-white">{kpis ? `${kpis.longs_percentage.toFixed(2)}%` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Shorts percentage:</span>
              <span className="font-bold font-mono text-white">{kpis ? `${kpis.shorts_percentage.toFixed(2)}%` : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Shorts count:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.shorts_count : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Fee:</span>
              <span className="font-bold font-mono text-[#FF4B55]">{kpis ? kpis.fee.toFixed(2) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Total open trades:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.total_open_trades : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#A1A5B0]">Open PL:</span>
              <span className="font-bold font-mono text-white">{kpis ? kpis.open_pl.toFixed(2) : '—'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl border border-[#FF4B55]/20 bg-[#FF4B55]/5 text-[#FF4B55] text-xs flex gap-3 items-center">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <span className="font-bold block">Simulation Failed</span>
            <span className="font-mono text-[10px]">{error}</span>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="h-64 flex flex-col gap-2 items-center justify-center text-xs text-[#A1A5B0] font-light font-mono bg-[#1A1D24] border border-white/5 rounded-xl">
          <span className="animate-pulse">Simulating strategy triggers across historical datasets...</span>
        </div>
      )}

      {/* Equity Curve Placeholder / Main Chart */}
      {!loading && !kpis && (
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-8 shadow-lg text-center flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-12 h-12 rounded-full bg-[#0F1115] border border-white/5 flex items-center justify-center mb-4">
            <Play className="w-5 h-5 text-[#FFB300] fill-[#FFB300]/10" />
          </div>
          <h4 className="text-sm font-bold text-white mb-1.5">Simulation Engine Inactive</h4>
          <p className="text-xs text-[#A1A5B0] font-light max-w-md mx-auto leading-relaxed">
            Configure your quantitative strategy parameters, symbols, and dates in the panel on the left, then click the gold <strong>Run Strategy</strong> button to calculate performance and generate curves.
          </p>
        </div>
      )}

      {/* Multi-Tab Analysis Charts */}
      {!loading && kpis && (
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-6 shadow-lg">
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6 border-b border-gray-800 pb-4">
            {/* Tab Selector */}
            <div className="flex items-center gap-2 overflow-x-auto">
              <button
                onClick={() => setActiveChartTab('equity')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeChartTab === 'equity'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'text-gray-400 hover:text-white bg-slate-900/40'
                }`}
              >
                Equity Curve
              </button>
              <button
                onClick={() => setActiveChartTab('drawdown')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeChartTab === 'drawdown'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-gray-400 hover:text-white bg-slate-900/40'
                }`}
              >
                Underwater Drawdown
              </button>
              <button
                onClick={() => setActiveChartTab('rolling_sharpe')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeChartTab === 'rolling_sharpe'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-gray-400 hover:text-white bg-slate-900/40'
                }`}
              >
                Rolling Sharpe (20p)
              </button>
              <button
                onClick={() => setActiveChartTab('monthly')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeChartTab === 'monthly'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-gray-400 hover:text-white bg-slate-900/40'
                }`}
              >
                Monthly Returns
              </button>
              <button
                onClick={() => setActiveChartTab('trade_dist')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeChartTab === 'trade_dist'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'text-gray-400 hover:text-white bg-slate-900/40'
                }`}
              >
                Trade Distribution
              </button>
              <button
                onClick={() => setActiveChartTab('montecarlo')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeChartTab === 'montecarlo'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'text-gray-400 hover:text-white bg-slate-900/40'
                }`}
              >
                Monte Carlo Engine
              </button>
            </div>

            {/* Filter indicators */}
            <div className="flex gap-2">
              <span className="px-2.5 py-1 bg-[#0F1115] border border-white/5 rounded text-[10px] font-mono font-bold text-[#A1A5B0]">
                Period: {tradingPeriod === 'custom' ? `${customStartDate} => ${customEndDate}` : tradingPeriod.toUpperCase()}
              </span>
              <span className="px-2.5 py-1 bg-[#0F1115] border border-white/5 rounded text-[10px] font-mono font-bold text-[#A1A5B0]">
                {symbol === 'custom' ? customTicker.toUpperCase() : symbol}
              </span>
              <span className="px-2.5 py-1 bg-[#0F1115] border border-white/5 rounded text-[10px] font-mono font-bold text-[#A1A5B0]">
                {timeframe}
              </span>
            </div>
          </div>

          <div className="w-full pr-4 relative min-h-[280px]">
            {/* 1. Equity Curve Tab */}
            {activeChartTab === 'equity' && (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={equityCurve} margin={{ right: 80, left: 10, top: 10, bottom: 10 }}>
                  <XAxis dataKey="timestamp" stroke="#A1A5B0" fontSize={10} tickFormatter={formatXAxis} tickLine={false} axisLine={false} />
                  <YAxis stroke="#A1A5B0" fontSize={10} domain={['auto', 'auto']} tickLine={false} axisLine={false} orientation="right" />
                  <Tooltip contentStyle={{ background: '#0a101e', borderColor: '#1e293b' }} labelStyle={{ color: '#94a3b8', fontSize: 10 }} itemStyle={{ fontSize: 11 }} formatter={(val: any) => [`$${Number(val).toFixed(2)}`]} />
                  <ReferenceLine y={10000} stroke="#475569" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="value" stroke="#2EE59D" strokeWidth={2} dot={false} name="Strategy Value" />
                  <Line type="monotone" dataKey="benchmark" stroke="#4D88FF" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Benchmark" />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* 2. Underwater Drawdown Tab */}
            {activeChartTab === 'drawdown' && (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={drawdownCurve} margin={{ right: 80, left: 10, top: 10, bottom: 10 }}>
                  <XAxis dataKey="timestamp" stroke="#A1A5B0" fontSize={10} tickFormatter={formatXAxis} tickLine={false} axisLine={false} />
                  <YAxis stroke="#A1A5B0" fontSize={10} domain={['auto', 0]} tickLine={false} axisLine={false} orientation="right" />
                  <Tooltip contentStyle={{ background: '#0a101e', borderColor: '#1e293b' }} labelStyle={{ color: '#94a3b8', fontSize: 10 }} formatter={(val: any) => [`${Number(val).toFixed(2)}%`]} />
                  <Line type="monotone" dataKey="drawdown" stroke="#FF4B55" strokeWidth={1.5} dot={false} name="Drawdown %" />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* 3. Rolling Sharpe Tab */}
            {activeChartTab === 'rolling_sharpe' && (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={rollingSharpeCurve} margin={{ right: 80, left: 10, top: 10, bottom: 10 }}>
                  <XAxis dataKey="timestamp" stroke="#A1A5B0" fontSize={10} tickFormatter={formatXAxis} tickLine={false} axisLine={false} />
                  <YAxis stroke="#A1A5B0" fontSize={10} domain={['auto', 'auto']} tickLine={false} axisLine={false} orientation="right" />
                  <Tooltip contentStyle={{ background: '#0a101e', borderColor: '#1e293b' }} formatter={(val: any) => [`${Number(val).toFixed(2)}`]} />
                  <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
                  <Line type="monotone" dataKey="sharpe" stroke="#00FF9D" strokeWidth={2} dot={false} name="20-period Sharpe" />
                </LineChart>
              </ResponsiveContainer>
            )}

            {/* 4. Monthly Returns Heatmap */}
            {activeChartTab === 'monthly' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-4">
                {monthlyReturnsData.map((m: any, idx: number) => (
                  <div key={idx} className={`p-3 rounded-lg border text-center font-mono ${m.return_pct >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
                    <div className="text-xs text-gray-400">{m.month}</div>
                    <div className="text-base font-bold mt-1">{m.return_pct >= 0 ? `+${m.return_pct}%` : `${m.return_pct}%`}</div>
                  </div>
                ))}
              </div>
            )}

            {/* 5. Trade Distribution Histogram */}
            {activeChartTab === 'trade_dist' && (
              <div className="space-y-2 py-4">
                {tradeDistData.map((b: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-3 text-xs font-mono">
                    <span className="w-36 text-gray-400 text-right">{b.bin}</span>
                    <div className="flex-1 bg-slate-900 rounded-full h-4 overflow-hidden border border-gray-800">
                      <div className="bg-cyan-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, b.count * 15)}%` }}></div>
                    </div>
                    <span className="w-8 text-cyan-300 font-bold">{b.count}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 6. Monte Carlo Engine */}
            {activeChartTab === 'montecarlo' && (
              <div className="space-y-4 py-2">
                {loadingMonteCarlo && <div className="text-center text-xs text-gray-400 animate-pulse py-8">Simulating N=1,000 randomized execution paths...</div>}

                {monteCarloData && (
                  <div>
                    <div className="grid grid-cols-3 gap-3 mb-4 font-mono text-xs">
                      <div className="p-3 bg-slate-900 rounded-lg border border-purple-500/20">
                        <div className="text-gray-400">Probability of Ruin</div>
                        <div className="text-lg font-bold text-rose-400">{monteCarloData.metrics.probability_of_ruin}%</div>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-lg border border-purple-500/20">
                        <div className="text-gray-400">Median Final Equity</div>
                        <div className="text-lg font-bold text-cyan-300">${monteCarloData.metrics.median_final_equity}</div>
                      </div>
                      <div className="p-3 bg-slate-900 rounded-lg border border-purple-500/20">
                        <div className="text-gray-400">Expected Max DD</div>
                        <div className="text-lg font-bold text-amber-400">{monteCarloData.metrics.max_expected_drawdown}%</div>
                      </div>
                    </div>

                    <p className="text-xs text-purple-300 font-mono">Resampled N=1,000 execution paths. Percentile ranges: 5th percentile (worst-case), 50th percentile (median), 95th percentile (best-case).</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}


      {/* Backtest Execution Logs Terminal */}
      {!loading && kpis && backtestLogs.length > 0 && (
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-6 shadow-lg">
          <h3 className="text-xs font-bold text-[#A1A5B0] uppercase tracking-wider pb-2 border-b border-white/5 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FFB300]" />
            Backtest Execution Logs
          </h3>
          <div className="bg-[#0F1115] border border-white/5 rounded-lg p-4 h-60 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1.5 scrollbar-thin">
            {backtestLogs.map((log, idx) => {
              let colorClass = 'text-slate-400';
              if (log.includes('[System]')) colorClass = 'text-[#4D88FF] font-semibold';
              else if (log.includes('BUY')) colorClass = 'text-[#2EE59D]';
              else if (log.includes('SELL')) colorClass = 'text-[#FF4B55]';
              return (
                <div key={idx} className={colorClass}>
                  {log}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
