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
}

export default function Backtester({ strategies, selectedStrategyId }: BacktesterProps) {
  // Filter Metrics states
  const [tradingPeriod, setTradingPeriod] = useState('2y');
  const [customStartDate, setCustomStartDate] = useState('2020-01-01');
  const [customEndDate, setCustomEndDate] = useState('2023-01-01');
  const [symbol, setSymbol] = useState('BTC-USDT');
  const [customTicker, setCustomTicker] = useState('EURUSD=X');
  const [timeframe, setTimeframe] = useState('15m');
  const [activeId, setActiveId] = useState(selectedStrategyId);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [kpis, setKpis] = useState<any>(null);
  const [equityCurve, setEquityCurve] = useState<any[]>([]);
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

  const handleRunBacktest = async (_initialRun = false) => {
    setLoading(true);
    setError('');
    
    // Map Symbol to standard yahoo format
    let mappedSymbol = symbol;
    if (symbol === 'BTC-USDT') mappedSymbol = 'BTC-USD';
    else if (symbol === 'ETH-USDT') mappedSymbol = 'ETH-USD';
    else if (symbol === 'custom') mappedSymbol = customTicker;
    
    // Map Trading Period to yahoo period
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
          commission_pct: 0.001
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setKpis(data.kpis);
          setEquityCurve(data.equity_curve);
          
          // Assemble simulation logs
          const logsList: string[] = [];
          logsList.push(`[System] Initializing backtest simulation...`);
          logsList.push(`[System] Symbol: ${mappedSymbol.toUpperCase()}`);
          logsList.push(`[System] Timeframe: ${timeframe}`);
          logsList.push(`[System] Downloading historical candles from Yahoo Finance...`);
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
          logsList.push(`[System] Sharpe Ratio: ${data.kpis.sharpe_ratio.toFixed(2)} | Sortino: ${data.kpis.sortino_ratio.toFixed(2)}`);
          
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

  // Calculate final numbers for reference line display
  const finalPortfolioValue = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].value : 10000;
  const finalBenchmarkValue = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].benchmark : 10000;

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
                <label className="block text-[#A1A5B0] text-[9px] font-bold uppercase tracking-wider mb-1.5">Symbol</label>
                <select
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F1115] border border-white/5 rounded-lg text-xs font-semibold outline-none focus:border-[#4D88FF]/50 text-white"
                >
                  <option value="BTC-USDT">BTC/USDT (Crypto)</option>
                  <option value="ETH-USDT">ETH/USDT (Crypto)</option>
                  <option value="AAPL">AAPL (NASDAQ)</option>
                  <option value="TSLA">TSLA (NASDAQ)</option>
                  <option value="custom">Custom Exchange Ticker</option>
                </select>

                {symbol === 'custom' && (
                  <div className="mt-3">
                    <label className="block text-[#A1A5B0] text-[8px] font-bold uppercase tracking-wider mb-1">yfinance Ticker Suffix</label>
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

      {/* Equity Curve Line Chart */}
      {!loading && kpis && (
        <div className="bg-[#1A1D24] border border-white/5 rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-white">Equity Curve</h3>
            
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
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={equityCurve} margin={{ right: 80, left: 10, top: 10, bottom: 10 }}>
                <XAxis 
                  dataKey="timestamp" 
                  stroke="#A1A5B0"
                  fontSize={10}
                  tickFormatter={formatXAxis}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#A1A5B0"
                  fontSize={10}
                  domain={['auto', 'auto']}
                  tickLine={false}
                  axisLine={false}
                  orientation="right"
                />
                <Tooltip 
                  contentStyle={{ background: '#0a101e', borderColor: '#1e293b' }}
                  labelStyle={{ color: '#94a3b8', fontSize: 10 }}
                  itemStyle={{ fontSize: 11 }}
                  formatter={(val: any) => [`$${Number(val).toFixed(2)}`]}
                />
                
                {/* Horizontal Reference Lines matching Final Values */}
                <ReferenceLine 
                  y={finalPortfolioValue} 
                  stroke="#4D88FF" 
                  strokeDasharray="3 3" 
                  label={{ 
                    value: finalPortfolioValue.toFixed(2), 
                    position: 'right', 
                    fill: '#4D88FF', 
                    fontSize: 10,
                    fontWeight: 'bold',
                    className: 'font-mono' 
                  }} 
                />
                <ReferenceLine 
                  y={finalBenchmarkValue} 
                  stroke="#FFB300" 
                  strokeDasharray="3 3" 
                  label={{ 
                    value: finalBenchmarkValue.toFixed(2), 
                    position: 'right', 
                    fill: '#FFB300', 
                    fontSize: 10,
                    fontWeight: 'bold',
                    className: 'font-mono' 
                  }} 
                />

                <Line 
                  type="monotone" 
                  dataKey="value" 
                  name="Portfolio"
                  stroke="#4D88FF" 
                  strokeWidth={2}
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="benchmark" 
                  name={symbol === 'custom' ? customTicker.toUpperCase() : symbol}
                  stroke="#FFB300" 
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Legend */}
          <div className="flex gap-4 mt-4 text-xs font-semibold pl-2">
            <span className="flex items-center gap-2">
              <span className="w-4 h-1.5 rounded-full bg-[#4D88FF] inline-block" />
              Portfolio
            </span>
            <span className="flex items-center gap-2">
              <span className="w-4 h-1.5 rounded-full bg-[#FFB300] inline-block" />
              {symbol === 'custom' ? customTicker.toUpperCase() : symbol}
            </span>
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
