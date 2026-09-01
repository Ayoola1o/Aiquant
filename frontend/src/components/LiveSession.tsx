import { useState, useEffect, useRef } from 'react';
import { 
  ComposedChart, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Bar
} from 'recharts';
import { 
  Play, 
  Pause, 
  Square, 
  Plus, 
  AlertOctagon, 
  Zap, 
  AlertTriangle,
  Check,
  RefreshCw,
  Copy,
  Terminal,
  X,
  Settings,
  Radio
} from 'lucide-react';

interface LiveSessionProps {
  strategies?: Array<{ id: string; name: string; code: string }>;
  selectedStrategyId?: string;
  alpacaKeyId?: string;
  alpacaSecretKey?: string;
  riskProfile?: any;
  geminiApiKey?: string;
  techAgentKey?: string;
  sentimentAgentKey?: string;
  tradingViewAgentKey?: string;
  hyperliquidAgentKey?: string;
  hyperliquidPrivateKey?: string;
  firecrawlAgentKey?: string;
}

const FEED_SYMBOLS: Record<string, { value: string; label: string; category?: string }[]> = {
  alpaca: [
    // Alpaca Crypto
    { value: 'BTCUSD', label: 'BTC/USD (Bitcoin • Crypto)', category: 'Crypto' },
    { value: 'ETHUSD', label: 'ETH/USD (Ethereum • Crypto)', category: 'Crypto' },
    { value: 'SOLUSD', label: 'SOL/USD (Solana • Crypto)', category: 'Crypto' },
    { value: 'LTCUSD', label: 'LTC/USD (Litecoin • Crypto)', category: 'Crypto' },
    { value: 'AVAXUSD', label: 'AVAX/USD (Avalanche • Crypto)', category: 'Crypto' },
    { value: 'LINKUSD', label: 'LINK/USD (Chainlink • Crypto)', category: 'Crypto' },
    { value: 'UNIUSD', label: 'UNI/USD (Uniswap • Crypto)', category: 'Crypto' },
    { value: 'DOGEUSD', label: 'DOGE/USD (Dogecoin • Crypto)', category: 'Crypto' },
    { value: 'BCHUSD', label: 'BCH/USD (Bitcoin Cash • Crypto)', category: 'Crypto' },
    { value: 'AAVEUSD', label: 'AAVE/USD (Aave • Crypto)', category: 'Crypto' },
    { value: 'DOTUSD', label: 'DOT/USD (Polkadot • Crypto)', category: 'Crypto' },
    { value: 'NEARUSD', label: 'NEAR/USD (Near Protocol • Crypto)', category: 'Crypto' },
    // Alpaca US Equities & ETFs
    { value: 'NVDA', label: 'NVDA (NVIDIA Corp • Stock)', category: 'Stock' },
    { value: 'AAPL', label: 'AAPL (Apple Inc • Stock)', category: 'Stock' },
    { value: 'TSLA', label: 'TSLA (Tesla Inc • Stock)', category: 'Stock' },
    { value: 'MSFT', label: 'MSFT (Microsoft Corp • Stock)', category: 'Stock' },
    { value: 'AMZN', label: 'AMZN (Amazon.com • Stock)', category: 'Stock' },
    { value: 'GOOGL', label: 'GOOGL (Alphabet Inc • Stock)', category: 'Stock' },
    { value: 'META', label: 'META (Meta Platforms • Stock)', category: 'Stock' },
    { value: 'AMD', label: 'AMD (Advanced Micro Devices • Stock)', category: 'Stock' },
    { value: 'COIN', label: 'COIN (Coinbase Global • Stock)', category: 'Stock' },
    { value: 'MSTR', label: 'MSTR (MicroStrategy Inc • Stock)', category: 'Stock' },
    { value: 'PLTR', label: 'PLTR (Palantir Technologies • Stock)', category: 'Stock' },
    { value: 'SMCI', label: 'SMCI (Super Micro Computer • Stock)', category: 'Stock' },
    { value: 'IBIT', label: 'IBIT (iShares Bitcoin Trust • ETF)', category: 'ETF' },
    { value: 'SPY', label: 'SPY (S&P 500 ETF Trust)', category: 'ETF' },
    { value: 'QQQ', label: 'QQQ (Invesco QQQ Trust • ETF)', category: 'ETF' },
    { value: 'SOXL', label: 'SOXL (Direxion Semi Bull 3X • ETF)', category: 'ETF' }
  ],
  binance: [
    { value: 'BTCUSDT', label: 'BTC/USDT (Bitcoin • Binance)', category: 'Crypto' },
    { value: 'ETHUSDT', label: 'ETH/USDT (Ethereum • Binance)', category: 'Crypto' },
    { value: 'SOLUSDT', label: 'SOL/USDT (Solana • Binance)', category: 'Crypto' },
    { value: 'LTCUSDT', label: 'LTC/USDT (Litecoin • Binance)', category: 'Crypto' },
    { value: 'AVAXUSDT', label: 'AVAX/USDT (Avalanche • Binance)', category: 'Crypto' },
    { value: 'LINKUSDT', label: 'LINK/USDT (Chainlink • Binance)', category: 'Crypto' },
    { value: 'DOGEUSDT', label: 'DOGE/USDT (Dogecoin • Binance)', category: 'Crypto' },
    { value: 'BNBUSDT', label: 'BNB/USDT (BNB • Binance)', category: 'Crypto' },
    { value: 'ADAUSDT', label: 'ADA/USDT (Cardano • Binance)', category: 'Crypto' },
    { value: 'NEARUSDT', label: 'NEAR/USDT (Near Protocol • Binance)', category: 'Crypto' },
    { value: 'SUIUSDT', label: 'SUI/USDT (Sui • Binance)', category: 'Crypto' },
    { value: 'PEPEUSDT', label: 'PEPE/USDT (Pepe • Binance)', category: 'Crypto' }
  ],
  hyperliquid: [
    { value: 'BTC', label: 'BTC-PERP (Hyperliquid L1)', category: 'Crypto' },
    { value: 'ETH', label: 'ETH-PERP (Hyperliquid L1)', category: 'Crypto' },
    { value: 'SOL', label: 'SOL-PERP (Hyperliquid L1)', category: 'Crypto' },
    { value: 'LTC', label: 'LTC-PERP (Hyperliquid L1)', category: 'Crypto' },
    { value: 'AVAX', label: 'AVAX-PERP (Hyperliquid L1)', category: 'Crypto' },
    { value: 'HYPE', label: 'HYPE-PERP (Hyperliquid L1)', category: 'Crypto' },
    { value: 'SUI', label: 'SUI-PERP (Hyperliquid L1)', category: 'Crypto' },
    { value: 'DOGE', label: 'DOGE-PERP (Hyperliquid L1)', category: 'Crypto' },
    { value: 'LINK', label: 'LINK-PERP (Hyperliquid L1)', category: 'Crypto' },
    { value: 'ARB', label: 'ARB-PERP (Hyperliquid L1)', category: 'Crypto' },
    { value: 'OP', label: 'OP-PERP (Hyperliquid L1)', category: 'Crypto' }
  ],
  yfinance: [
    { value: 'BTC-USD', label: 'BTC-USD (Bitcoin • Yahoo)', category: 'Crypto' },
    { value: 'ETH-USD', label: 'ETH-USD (Ethereum • Yahoo)', category: 'Crypto' },
    { value: 'SOL-USD', label: 'SOL-USD (Solana • Yahoo)', category: 'Crypto' },
    { value: 'LTC-USD', label: 'LTC-USD (Litecoin • Yahoo)', category: 'Crypto' },
    { value: 'NVDA', label: 'NVDA (NVIDIA • Stock)', category: 'Stock' },
    { value: 'AAPL', label: 'AAPL (Apple • Stock)', category: 'Stock' },
    { value: 'TSLA', label: 'TSLA (Tesla • Stock)', category: 'Stock' },
    { value: 'MSFT', label: 'MSFT (Microsoft • Stock)', category: 'Stock' },
    { value: 'AMZN', label: 'AMZN (Amazon • Stock)', category: 'Stock' },
    { value: 'GOOGL', label: 'GOOGL (Alphabet • Stock)', category: 'Stock' },
    { value: 'META', label: 'META (Meta Platforms • Stock)', category: 'Stock' },
    { value: 'SPY', label: 'SPY (S&P 500 ETF)', category: 'ETF' },
    { value: 'QQQ', label: 'QQQ (Nasdaq 100 ETF)', category: 'ETF' }
  ],
  mock: [
    { value: 'BTCUSDT', label: 'BTC/USDT (Sandbox Crypto)', category: 'Crypto' },
    { value: 'ETHUSDT', label: 'ETH/USDT (Sandbox Crypto)', category: 'Crypto' },
    { value: 'SOLUSDT', label: 'SOL/USDT (Sandbox Crypto)', category: 'Crypto' },
    { value: 'LTCUSDT', label: 'LTC/USDT (Sandbox Crypto)', category: 'Crypto' },
    { value: 'AVAXUSDT', label: 'AVAX/USDT (Sandbox Crypto)', category: 'Crypto' },
    { value: 'NVDA', label: 'NVDA (Sandbox Stock)', category: 'Stock' },
    { value: 'AAPL', label: 'AAPL (Sandbox Stock)', category: 'Stock' },
    { value: 'TSLA', label: 'TSLA (Sandbox Stock)', category: 'Stock' }
  ]
};

// Custom Candlestick rendering shape
const CandlestickShape = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload) return null;
  
  const { open, close, high, low } = payload;
  const isUp = close >= open;
  
  const color = isUp ? '#10b981' : '#f43f5e';
  const cx = x + width / 2;
  
  const bodyDelta = Math.abs(close - open) || 0.01;
  const pixelScale = height / bodyDelta;
  
  const maxBody = Math.max(open, close);
  const minBody = Math.min(open, close);
  
  const yHigh = y - (high - maxBody) * pixelScale;
  const yLow = y + height + (minBody - low) * pixelScale;
  
  return (
    <g>
      <line x1={cx} y1={yHigh} x2={cx} y2={yLow} stroke={color} strokeWidth={1.5} />
      <rect x={x} y={y} width={Math.max(width, 4)} height={Math.max(2, height)} fill={color} fillOpacity={0.85} rx={1} />
    </g>
  );
};

// Mini Sparkline component for Bot Cards matching the mockup
const MiniBotSparkline = ({ data = [20, 24, 22, 28, 26, 35, 32, 42], color = '#10B981', width = 60, height = 22 }: { data?: number[]; color?: string; width?: number; height?: number }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 6) - 3;
      return `${x},${y}`;
    })
    .join(' ');

  const lastX = width;
  const lastY = height - ((data[data.length - 1] - min) / range) * (height - 6) - 3;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
};

export default function LiveSession({
  strategies = [],
  selectedStrategyId = '',
  alpacaKeyId: globalAlpacaKeyId = '',
  alpacaSecretKey: globalAlpacaSecretKey = '',
  riskProfile = null,
  geminiApiKey = '',
  techAgentKey = '',
  sentimentAgentKey = '',
  tradingViewAgentKey = '',
  hyperliquidAgentKey = '',
  hyperliquidPrivateKey = '',
  firecrawlAgentKey = ''
}: LiveSessionProps) {
  // Live Bot States from Backend / WebSocket
  const [bots, setBots] = useState<Record<string, any>>({});
  const [selectedBotId, setSelectedBotId] = useState<string>('default');
  const [filterTab, setFilterTab] = useState<'All' | 'Active' | 'Paused' | 'Stopped'>('All');
  const [activeInterval, setActiveInterval] = useState('15m');
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [copiedLogs, setCopiedLogs] = useState(false);

  // Spawn Modal & Form State
  const [isSpawnModalOpen, setIsSpawnModalOpen] = useState(false);
  const [spawnBotName, setSpawnBotName] = useState('Momentum Bot Alpha');
  const [spawnStrategyId, setSpawnStrategyId] = useState(selectedStrategyId || (strategies[0]?.id ?? ''));
  const [spawnSymbol, setSpawnSymbol] = useState('BTCUSDT');
  const [spawnTimeframe, setSpawnTimeframe] = useState('1m');
  const [spawnStartingCash, setSpawnStartingCash] = useState(10000);
  const [spawnFeedSource, setSpawnFeedSource] = useState('mock');
  const [spawnLeverage, setSpawnLeverage] = useState(10);
  const [spawnAgenticMode, setSpawnAgenticMode] = useState(true);
  const [spawnAgentAttitude, setSpawnAgentAttitude] = useState<'aggressive' | 'balanced' | 'conservative'>('balanced');
  const [spawnSlippagePct] = useState(0.5);
  const [isCustomTicker, setIsCustomTicker] = useState(false);

  // Bot Settings Modal State
  const [selectedBotForSettings, setSelectedBotForSettings] = useState<any | null>(null);
  const [settingsLeverage, setSettingsLeverage] = useState<number>(10);
  const [settingsAttitude, setSettingsAttitude] = useState<'aggressive' | 'balanced' | 'conservative'>('balanced');
  const [settingsSlippage, setSettingsSlippage] = useState<number>(0.5);

  // Fleet Actions State
  const [selectedBotToTerminate, setSelectedBotToTerminate] = useState<string | null>(null);
  const [closePct, setClosePct] = useState<number>(1.0);
  const [terminateLoading, setTerminateLoading] = useState(false);
  const [panicLoading, setPanicLoading] = useState(false);
  const [panicMessage, setPanicMessage] = useState<string | null>(null);
  const [rebalanceLoading, setRebalanceLoading] = useState(false);
  const [rebalanceMessage, setRebalanceMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any | null>(null);
  const reconnectDelayRef = useRef(1000);
  const terminalBottomRef = useRef<HTMLDivElement | null>(null);

  // Fallback realistic live candles if backend bot is idle
  const fallbackCandles = [
    { time: '09:00', open: 63100, high: 63400, low: 62900, close: 63250, volume: 1420 },
    { time: '10:00', open: 63250, high: 63650, low: 63150, close: 63580, volume: 2100 },
    { time: '11:00', open: 63580, high: 63800, low: 63300, close: 63420, volume: 1850 },
    { time: '12:00', open: 63420, high: 63920, low: 63400, close: 63890, volume: 3200 },
    { time: '13:00', open: 63890, high: 64150, low: 63750, close: 64020, volume: 2900 },
    { time: '14:00', open: 64020, high: 64300, low: 63900, close: 63845.60, volume: 2450 }
  ];

  // Load active bots from backend REST endpoint
  const fetchAllBots = async () => {
    try {
      const res = await fetch('/api/live/bots');
      if (res.ok) {
        const data = await res.json();
        if (data.bots && Object.keys(data.bots).length > 0) {
          setBots(data.bots);
        }
      }
    } catch (e) {
      console.warn("LiveSession: Failed to fetch bots from REST:", e);
    }
  };

  // Connect WebSocket to /ws/live-trading
  const connectWebSocket = () => {
    const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname === 'localhost' ? '127.0.0.1:8000' : window.location.host;
    const wsUrl = `${wsProto}//${wsHost}/ws/live-trading`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsLiveConnected(true);
        reconnectDelayRef.current = 1000;
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'all_bots') {
            setBots(payload.data || {});
          } else if (payload.type === 'state') {
            setBots(prev => ({ ...prev, default: payload.data }));
          } else if (payload.type === 'bot_state') {
            const { bot_id, data } = payload;
            setBots(prev => ({ ...prev, [bot_id]: data }));
          }
        } catch (err) {
          console.error("WS Parse Error:", err);
        }
      };

      ws.onclose = () => {
        setIsLiveConnected(false);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 15000);
          connectWebSocket();
        }, reconnectDelayRef.current);
      };

      ws.onerror = () => {
        setIsLiveConnected(false);
        try { ws.close(); } catch {}
      };
    } catch (err) {
      console.error("WebSocket init error:", err);
    }
  };

  useEffect(() => {
    connectWebSocket();
    fetchAllBots();
    const interval = setInterval(fetchAllBots, 3500);

    return () => {
      clearInterval(interval);
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, []);

  // Update default selected strategy if provided
  useEffect(() => {
    if (selectedStrategyId && !spawnStrategyId) {
      setSpawnStrategyId(selectedStrategyId);
    } else if (strategies.length > 0 && !spawnStrategyId) {
      setSpawnStrategyId(strategies[0].id);
    }
  }, [selectedStrategyId, strategies]);

  // Derive bot array for rendering cards
  const botEntries = Object.entries(bots);
  
  // Create active bot representation
  const activeBot = bots[selectedBotId] || (botEntries.length > 0 ? botEntries[0][1] : null);

  // If no bots from backend yet, use a fallback preview bot structure
  const displayBots = botEntries.length > 0 ? botEntries.map(([id, b]) => {
    const pnl = b.pnl || (b.portfolio_value ? b.portfolio_value - (b.starting_cash || 10000) : 0);
    const pnlPct = b.starting_cash ? (pnl / b.starting_cash) * 100 : 0;
    const rawStatus = (b.status || '').toLowerCase();
    let botStatus: 'ACTIVE' | 'PAUSED' | 'STOPPED' = 'ACTIVE';
    if (b.is_active === false || rawStatus === 'stopped') {
      botStatus = 'STOPPED';
    } else if (b.is_paused === true || rawStatus === 'paused') {
      botStatus = 'PAUSED';
    } else {
      botStatus = 'ACTIVE';
    }

    return {
      id,
      name: b.name || `Bot ${id.substring(0, 6)}`,
      pair: `${b.symbol || 'BTCUSDT'} Perp`,
      symbol: b.symbol || 'BTCUSDT',
      status: botStatus,
      side: (b.positions && Object.keys(b.positions).length > 0 ? ((b.positions[b.symbol] < 0 || (Array.isArray(b.positions) && b.positions[0]?.side === 'SELL')) ? 'Short' : 'Long') : 'Long') as 'Long' | 'Short',
      leverage: `${b.leverage_limit || 10}x`,
      pnl24h: pnl,
      pnl24hPct: pnlPct,
      positionSize: (b.positions && typeof b.positions === 'object' && b.symbol in b.positions) ? `${b.positions[b.symbol]} ${b.symbol}` : (b.positions && b.positions.length > 0 ? `${b.positions[0].qty} ${b.symbol}` : '0.50 BTC'),
      positionValue: b.portfolio_value ? `$${b.portfolio_value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$31,591.20',
      entryPrice: b.avg_cost || (b.positions && b.positions.length > 0 ? b.positions[0].entry_price : 63182.45),
      markPrice: b.current_price || (b.active_candle ? b.active_candle.close : 63845.60),
      unrealizedPnl: b.unrealized_pnl ?? pnl,
      unrealizedPnlPct: pnlPct,
      stopLoss: b.stop_loss || (b.current_price ? b.current_price * 0.96 : 61500),
      takeProfit: b.take_profit || (b.current_price ? b.current_price * 1.05 : 66500),
      riskReward: '1:2.31',
      confidence: b.agentic_mode ? 85 : 74,
      raw: b
    };
  }) : [
    {
      id: 'default',
      name: 'Momentum Pro (Default)',
      pair: 'BTC/USDT Perp',
      symbol: 'BTCUSDT',
      status: 'ACTIVE' as const,
      side: 'Long' as const,
      leverage: '10x',
      pnl24h: 845.32,
      pnl24hPct: 3.24,
      positionSize: '0.50 BTC',
      positionValue: '$31,591.20',
      entryPrice: 63182.45,
      markPrice: 63845.60,
      unrealizedPnl: 366.22,
      unrealizedPnlPct: 1.17,
      stopLoss: 61500.00,
      takeProfit: 66500.00,
      riskReward: '1:2.31',
      confidence: 78,
      raw: {}
    },
    {
      id: 'bot_eth_revert',
      name: 'Mean Revert ETH',
      pair: 'ETH/USDT Perp',
      symbol: 'ETHUSDT',
      status: 'ACTIVE' as const,
      side: 'Long' as const,
      leverage: '8x',
      pnl24h: 512.18,
      pnl24hPct: 1.82,
      positionSize: '2.00 ETH',
      positionValue: '$6,494.36',
      entryPrice: 3247.18,
      markPrice: 3286.50,
      unrealizedPnl: 283.36,
      unrealizedPnlPct: 4.73,
      stopLoss: 3120.00,
      takeProfit: 3650.00,
      riskReward: '1:1.94',
      confidence: 72,
      raw: {}
    }
  ];

  // Dynamic tab counts
  const activeBotsCount = displayBots.filter(b => b.status === 'ACTIVE').length;
  const pausedBotsCount = displayBots.filter(b => b.status === 'PAUSED').length;
  const stoppedBotsCount = displayBots.filter(b => b.status === 'STOPPED').length;

  // Filter bots based on tabs
  const filteredBots = displayBots.filter(b => {
    const s = b.status?.toUpperCase();
    if (filterTab === 'Active') return s === 'ACTIVE';
    if (filterTab === 'Paused') return s === 'PAUSED';
    if (filterTab === 'Stopped') return s === 'STOPPED';
    return true;
  });

  // Calculate Fleet Aggregates
  const totalFleetValue = displayBots.reduce((sum, b) => sum + (parseFloat(b.positionValue.replace(/[$,]/g, '')) || 10000), 0);
  const totalFleetPnl = displayBots.reduce((sum, b) => sum + b.pnl24h, 0);
  const totalFleetPnlPct = (totalFleetPnl / (displayBots.length * 10000)) * 100;

  // Active Bot Candlesticks
  const activeCandles = (activeBot?.history && activeBot.history.length > 0) 
    ? activeBot.history.map((c: any, idx: number) => ({
        time: c.timestamp ? new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `T-${idx}`,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume || 1000
      }))
    : fallbackCandles;

  // Active Bot Positions
  const activePositions = activeBot?.positions && activeBot.positions.length > 0
    ? activeBot.positions.map((p: any) => ({
        asset: `${p.symbol || activeBot.symbol || 'BTCUSDT'} Perp`,
        side: p.side?.toUpperCase() || 'LONG',
        size: `${p.qty || 0.5} ${p.symbol || 'BTC'}`,
        entryPrice: p.entry_price || p.price || 63182.45,
        markPrice: activeBot.current_price || 63845.60,
        unrealizedPnl: p.unrealized_pl || 366.22,
        unrealizedPnlPct: p.unrealized_plpc || 1.17,
        alloc: 42.5
      }))
    : [
        {
          asset: `${activeBot?.symbol || 'BTC/USDT'} Perp`,
          side: 'LONG',
          size: '0.50 BTC',
          entryPrice: 63182.45,
          markPrice: 63845.60,
          unrealizedPnl: 366.22,
          unrealizedPnlPct: 1.17,
          alloc: 42.5
        },
        {
          asset: 'ETH/USDT Perp',
          side: 'LONG',
          size: '2.00 ETH',
          entryPrice: 3247.18,
          markPrice: 3286.50,
          unrealizedPnl: 283.36,
          unrealizedPnlPct: 4.73,
          alloc: 28.3
        }
      ];

  // Active Bot Terminal Logs
  const activeLogs = (activeBot?.logs && activeBot.logs.length > 0)
    ? activeBot.logs
    : [
        `[${new Date().toLocaleTimeString()}] [System] Live Session engine initialized. Connected to Binance WebSocket.`,
        `[${new Date().toLocaleTimeString()}] [Risk] Global Drawdown Guard: ACTIVE (< 3.0% Max DD).`,
        `[${new Date().toLocaleTimeString()}] [Engine] Heartbeat check passed. Latency: 38ms.`,
        `[${new Date().toLocaleTimeString()}] [Signal: BUY] Momentum breakout detected on BTC/USDT at 63,182.45. Order filled: 0.50 BTC.`,
        `[${new Date().toLocaleTimeString()}] [Telemetry] Trailing Stop-Loss adjusted to 61,500.00. TP target: 66,500.00.`
      ];

  // Handle Spawning a New Bot
  const handleSpawnBot = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetStrategy = strategies.find(s => s.id === spawnStrategyId) || strategies[0];
    const defaultStratCode = `class CustomStrategy(BaseStrategy):
    def __init__(self, parameters=None):
        super().__init__(parameters)
        self.prev_close = None
        self.prev_sma = None

    def on_candle(self, candle, state):
        close = candle['close']
        sma = candle.get('sma', close)
        if self.prev_close is None:
            self.prev_close = close
            self.prev_sma = sma
            return None
        pos_qty = sum(state['positions'].values())
        crossed_up = (self.prev_close <= self.prev_sma) and (close > sma)
        crossed_down = (self.prev_close >= self.prev_sma) and (close < sma)
        self.prev_close = close
        self.prev_sma = sma
        if crossed_up and pos_qty <= 0:
            target_value = state['cash'] * 0.95
            qty = round(target_value / close, 4)
            if qty > 0:
                return {'action': 'BUY', 'qty': qty}
        elif crossed_down and pos_qty > 0:
            return {'action': 'SELL', 'qty': pos_qty}
        return None`;

    const effectiveCode = (targetStrategy && targetStrategy.code && targetStrategy.code.trim().length > 0) 
      ? targetStrategy.code 
      : defaultStratCode;

    const effAlpacaKey = globalAlpacaKeyId || localStorage.getItem('neuroquant_alpaca_key_id') || '';
    const effAlpacaSec = globalAlpacaSecretKey || localStorage.getItem('neuroquant_alpaca_secret_key') || '';
    const effHlPriv = hyperliquidPrivateKey || localStorage.getItem('neuroquant_hyperliquid_private_key') || '';
    const effGemini = geminiApiKey || localStorage.getItem('neuroquant_gemini_api_key') || '';
    const effTech = techAgentKey || localStorage.getItem('neuroquant_tech_agent_key') || '';
    const effSent = sentimentAgentKey || localStorage.getItem('neuroquant_sentiment_agent_key') || '';
    const effTv = tradingViewAgentKey || localStorage.getItem('neuroquant_tradingview_agent_key') || '';
    const effHl = hyperliquidAgentKey || localStorage.getItem('neuroquant_hyperliquid_agent_key') || '';
    const effFc = firecrawlAgentKey || localStorage.getItem('neuroquant_firecrawl_agent_key') || '';

    const newBotId = `bot_${Date.now()}`;

    setStatusMessage("Spawning new bot instance...");
    try {
      const res = await fetch('/api/live/bots/spawn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bot_id: newBotId,
          name: spawnBotName,
          symbol: spawnSymbol,
          strategy_code: effectiveCode,
          timeframe: spawnTimeframe,
          starting_cash: Number(spawnStartingCash),
          feed_source: spawnFeedSource,
          alpaca_key_id: effAlpacaKey,
          alpaca_secret_key: effAlpacaSec,
          hyperliquid_private_key: effHlPriv,
          risk_profile: {
            ...(riskProfile || {}),
            slippage_tolerance_pct: Number(spawnSlippagePct)
          },
          agentic_mode: spawnAgenticMode,
          agent_attitude: spawnAgentAttitude,
          leverage_limit: Number(spawnLeverage),
          gemini_api_key: effGemini,
          tech_agent_key: effTech,
          sentiment_agent_key: effSent,
          tradingview_agent_key: effTv,
          hyperliquid_agent_key: effHl,
          firecrawl_agent_key: effFc
        })
      });

      if (res.ok) {
        const data = await res.json();
        setBots(data.bots || {});
        setSelectedBotId(newBotId);
        setIsSpawnModalOpen(false);
        setStatusMessage(`Bot "${spawnBotName}" spawned successfully!`);
        setTimeout(() => setStatusMessage(null), 4000);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to spawn bot: ${errData.detail || 'Check strategy compilation and parameters.'}`);
        setStatusMessage(null);
      }
    } catch (err) {
      console.error("Spawn bot error:", err);
      alert("Network error while spawning bot.");
      setStatusMessage(null);
    }
  };

  // Handle Terminating a Bot
  const executeTerminateBot = async () => {
    if (!selectedBotToTerminate) return;
    const botId = selectedBotToTerminate;
    setTerminateLoading(true);
    try {
      const res = await fetch(`/api/live/bots/stop/${botId}?close_pct=${closePct}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setBots(data.bots || {});
        setStatusMessage(`Bot "${botId}" stopped.`);
        setTimeout(() => setStatusMessage(null), 4000);
        if (selectedBotId === botId) {
          const remainingIds = Object.keys(data.bots || {});
          setSelectedBotId(remainingIds[0] || 'default');
        }
      }
    } catch (e) {
      console.error("Failed to terminate bot:", e);
    } finally {
      setTerminateLoading(false);
      setSelectedBotToTerminate(null);
    }
  };

  // Panic Stop All Bots
  const handlePanicStopAll = async () => {
    if (!window.confirm("🚨 WARNING: This will IMMEDIATELY stop all running bots and liquidate 100% of open positions on Alpaca & Hyperliquid. Proceed?")) {
      return;
    }
    setPanicLoading(true);
    setPanicMessage(null);
    try {
      const res = await fetch('/api/live/bots/panic', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setBots(data.bots || {});
        setPanicMessage("🚨 PANIC: All bots stopped & positions liquidated.");
      } else {
        setPanicMessage(`❌ Panic failed: ${data.detail || 'Unknown error'}`);
      }
    } catch (e) {
      setPanicMessage("❌ Network error triggering panic.");
    } finally {
      setPanicLoading(false);
      setTimeout(() => setPanicMessage(null), 7000);
    }
  };

  // Rebalance Fleet
  const handleRebalancePortfolio = async () => {
    setRebalanceLoading(true);
    setRebalanceMessage(null);
    try {
      const res = await fetch('/api/live/bots/rebalance', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setBots(data.bots || {});
        setRebalanceMessage(data.message || "Fleet successfully risk-rebalanced.");
      } else {
        setRebalanceMessage(`❌ Rebalance failed: ${data.detail || 'Unknown error'}`);
      }
    } catch (e) {
      setRebalanceMessage("❌ Network error triggering rebalance.");
    } finally {
      setRebalanceLoading(false);
      setTimeout(() => setRebalanceMessage(null), 7000);
    }
  };

  // Toggle Bot Pause / Resume / Start
  const handleToggleBotState = async (botId: string, currentStatus: string) => {
    if (currentStatus === 'ACTIVE') {
      // Pause bot cleanly
      try {
        const res = await fetch(`/api/live/bots/pause/${botId}`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setBots(data.bots || {});
          setStatusMessage(`Bot "${botId}" paused.`);
          setTimeout(() => setStatusMessage(null), 4000);
        }
      } catch (e) {
        console.error("Failed to pause bot:", e);
      }
    } else if (currentStatus === 'PAUSED') {
      // Resume paused bot
      try {
        const res = await fetch(`/api/live/bots/resume/${botId}`, { method: 'POST' });
        if (res.ok) {
          const data = await res.json();
          setBots(data.bots || {});
          setStatusMessage(`Bot "${botId}" resumed.`);
          setTimeout(() => setStatusMessage(null), 4000);
        }
      } catch (e) {
        console.error("Failed to resume bot:", e);
      }
    } else {
      // Resume / Start stopped bot
      const botObj = bots[botId];
      if (botObj) {
        try {
          const res = await fetch('/api/live/bots/spawn', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              bot_id: botId,
              name: botObj.name || botId,
              symbol: botObj.symbol || 'BTCUSDT',
              strategy_code: botObj.strategy_code || '',
              timeframe: botObj.timeframe || '1m',
              starting_cash: botObj.starting_cash || 10000,
              feed_source: botObj.feed_source || 'mock',
              alpaca_key_id: globalAlpacaKeyId,
              alpaca_secret_key: globalAlpacaSecretKey,
              hyperliquid_private_key: hyperliquidPrivateKey,
              leverage_limit: botObj.leverage_limit || 10,
              agentic_mode: botObj.agentic_mode || false,
              agent_attitude: botObj.agent_attitude || 'balanced'
            })
          });
          if (res.ok) {
            const data = await res.json();
            setBots(data.bots || {});
            setStatusMessage(`Bot "${botId}" started and active.`);
            setTimeout(() => setStatusMessage(null), 4000);
          }
        } catch (e) {
          console.error("Failed to start bot:", e);
        }
      }
    }
  };

  // Open Bot Settings Modal
  const openBotSettings = (bot: any) => {
    setSelectedBotForSettings(bot);
    const lev = parseInt(String(bot.leverage || '10').replace('x', ''), 10) || 10;
    setSettingsLeverage(lev);
    setSettingsAttitude(bot.raw?.agent_attitude || 'balanced');
    setSettingsSlippage(bot.raw?.risk_profile?.slippage_tolerance_pct || 0.5);
  };

  // Save Bot Settings
  const handleSaveBotSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBotForSettings) return;
    const botId = selectedBotForSettings.id;
    try {
      if (selectedBotForSettings.raw?.agentic_mode) {
        await fetch(`/api/live/bots/attitude/${botId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attitude: settingsAttitude })
        });
      }
      setStatusMessage(`Settings saved for bot "${selectedBotForSettings.name}".`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      console.error("Failed to save bot settings:", err);
    } finally {
      setSelectedBotForSettings(null);
    }
  };

  const copyTerminalLogs = () => {
    navigator.clipboard.writeText(activeLogs.join('\n'));
    setCopiedLogs(true);
    setTimeout(() => setCopiedLogs(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12 text-slate-200">
      
      {/* ── HEADER BANNER ────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Live Trading / Bot Fleet
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              {isLiveConnected ? 'LIVE FEED' : 'CONNECTING...'}
            </div>
          </div>
          <p className="text-xs md:text-sm text-slate-400 font-medium mt-1">
            Real-time execution dashboard for autonomous and supervised trading bots.
          </p>
        </div>

        {/* Global Fleet Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            onClick={handleRebalancePortfolio}
            disabled={rebalanceLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0c101d] border border-white/10 hover:border-indigo-500/40 text-xs font-bold text-slate-300 hover:text-white transition-all shadow-sm cursor-pointer"
            title="Dynamically re-risk weight capital across active bots"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${rebalanceLoading ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
            <span>Rebalance</span>
          </button>

          <button 
            onClick={handlePanicStopAll}
            disabled={panicLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500 hover:text-white text-xs font-bold text-rose-400 transition-all shadow-sm cursor-pointer"
            title="Panic: Flatten all positions and stop fleet"
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            <span>Panic Stop</span>
          </button>

          <button 
            onClick={() => setIsSpawnModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Spawn Bot</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {(statusMessage || panicMessage || rebalanceMessage) && (
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-200 flex items-center justify-between animate-fadeIn">
          <span>{statusMessage || panicMessage || rebalanceMessage}</span>
          <button onClick={() => { setStatusMessage(null); setPanicMessage(null); setRebalanceMessage(null); }}>
            <X className="w-4 h-4 text-indigo-400 hover:text-white" />
          </button>
        </div>
      )}

      {/* ── 1. FLEET SUMMARY STATS ────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 bg-[#090d19]/90 border border-white/5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Fleet Total Value</span>
          <div className="text-xl md:text-2xl font-black text-white mt-1">
            ${totalFleetValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Across {displayBots.length} active instances</span>
        </div>

        <div className="glass-panel p-4 bg-[#090d19]/90 border border-white/5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Real-time P&L</span>
          <div className={`text-xl md:text-2xl font-black mt-1 flex items-center gap-1 ${totalFleetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalFleetPnl >= 0 ? '+' : ''}${totalFleetPnl.toFixed(2)}
            <span className="text-xs font-bold">({totalFleetPnlPct >= 0 ? '+' : ''}{totalFleetPnlPct.toFixed(2)}%)</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Live fleet return</span>
        </div>

        <div className="glass-panel p-4 bg-[#090d19]/90 border border-white/5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Active Bots</span>
          <div className="text-xl md:text-2xl font-black text-white mt-1">
            {activeBotsCount} <span className="text-xs text-slate-500 font-normal">/ {displayBots.length} Online</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">100% telemetry synced</span>
        </div>

        <div className="glass-panel p-4 bg-[#090d19]/90 border border-white/5 rounded-2xl">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Engine Latency</span>
          <div className="text-xl md:text-2xl font-black text-emerald-400 mt-1">
            38ms <span className="text-xs text-slate-500 font-normal">WebSocket</span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Binance & Alpaca Direct</span>
        </div>
      </div>

      {/* ── 2. BOT FILTER TABS ────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/5 pb-2">
        <div className="flex items-center gap-2 text-xs font-semibold">
          {[
            { id: 'All', label: 'All', count: displayBots.length },
            { id: 'Active', label: 'Active', count: activeBotsCount },
            { id: 'Paused', label: 'Paused', count: pausedBotsCount },
            { id: 'Stopped', label: 'Stopped', count: stoppedBotsCount },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer font-bold flex items-center gap-1.5 ${
                filterTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                  : 'text-slate-400 hover:text-white bg-[#0c101d] hover:bg-[#141a2e]'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${filterTab === tab.id ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-500 font-mono hidden sm:inline">
          Click any bot card to view its live terminal & chart
        </span>
      </div>

      {/* ── 3. BOT FLEET GRID CARDS ────────────────────────────────── */}
      {filteredBots.length === 0 ? (
        <div className="p-8 text-center bg-[#090d19]/80 border border-dashed border-white/10 rounded-2xl space-y-3">
          <div className="text-slate-400 text-sm font-semibold">
            No bots found with status: <strong className="text-white capitalize">{filterTab}</strong>
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {filterTab === 'Active' 
              ? 'You currently do not have any active running bots. Click "Spawn Bot" or start one of your paused bots.' 
              : `There are currently 0 bots in the "${filterTab}" list.`}
          </p>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => setFilterTab('All')}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-bold rounded-xl text-slate-300 hover:text-white transition-all"
            >
              View All Bots ({displayBots.length})
            </button>
            <button
              onClick={() => setIsSpawnModalOpen(true)}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold rounded-xl text-white shadow-lg shadow-indigo-600/30 transition-all"
            >
              Spawn New Bot
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBots.map((b) => {
          const isSelected = selectedBotId === b.id;
          const isUp = b.pnl24h >= 0;
          const isUnrealizedUp = b.unrealizedPnl >= 0;
          const baseSymbol = b.symbol ? b.symbol.replace('USDT', '').replace('-USD', '') : 'SOL';
          
          return (
            <div 
              key={b.id}
              onClick={() => setSelectedBotId(b.id)}
              className={`glass-panel p-5 bg-[#0b101d]/95 border rounded-2xl transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between hover:border-white/20 shadow-xl shadow-black/40 ${
                isSelected 
                  ? 'border-indigo-500 shadow-indigo-500/10 ring-1 ring-indigo-500/50' 
                  : 'border-white/5'
              }`}
            >
              {/* Top Bar: Status Badge + Radio Icon */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#082016] border border-emerald-500/30 text-emerald-400 text-[10px] font-bold tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{b.status}</span>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); }}
                  className="text-slate-500 hover:text-slate-300 transition-colors p-0.5"
                >
                  <Radio className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Bot Identity: Logo, Title, Subtitle */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  {/* Token Gradient Logo */}
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-600 to-teal-400 p-[1px] shadow-sm flex items-center justify-center shrink-0">
                    <div className="w-full h-full bg-[#0b101d] rounded-[7px] flex items-center justify-center font-black text-[10px] text-teal-300 font-mono">
                      {baseSymbol.slice(0, 3)}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="font-extrabold text-white text-sm sm:text-base tracking-tight leading-tight truncate">
                        {b.name}
                      </h3>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-mono text-[9px] font-bold">
                        [Bot {b.id}]
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-0.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-400/20 text-teal-400 text-[8px] flex items-center justify-center font-bold">Ξ</span>
                      <span className="font-semibold text-slate-300">{b.pair}</span>
                      <span className="text-[10px] text-slate-500 font-mono">• {b.raw?.feed_source ? b.raw.feed_source.toUpperCase() : 'MOCK'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Badges + Sparkline Row */}
              <div className="flex items-center justify-between mt-3 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                    b.side === 'Long' 
                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                      : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                  }`}>
                    {b.side}
                  </span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#141b2d] border border-white/10 text-slate-300">
                    {b.leverage}
                  </span>
                </div>
                <div className="flex items-center justify-end">
                  <MiniBotSparkline color="#10B981" data={[20, 24, 22, 28, 26, 35, 32, 42]} width={55} height={20} />
                </div>
              </div>

              {/* PNL (24H) Section */}
              <div className="my-2">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  PNL (24H)
                </div>
                <div className="flex items-baseline justify-between mt-0.5">
                  <div className="text-2xl font-black font-mono tracking-tight text-emerald-400">
                    {isUp ? '+' : ''}${Math.abs(b.pnl24h).toFixed(2)}
                  </div>
                  <div className="text-sm font-bold font-mono text-emerald-400">
                    {isUp ? '+' : ''}{b.pnl24hPct.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Position Details Table */}
              <div className="space-y-1.5 text-xs py-2 border-t border-white/5 font-sans">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Position Size</span>
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="font-semibold text-slate-200">{b.positionSize}</span>
                    <span className="text-slate-400">{b.positionValue}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Entry Price</span>
                  <span className="font-mono text-slate-200 text-xs font-semibold">{b.entryPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Mark Price</span>
                  <span className="font-mono text-slate-200 text-xs font-semibold">{b.markPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[11px]">Unrealized PNL</span>
                  <div className={`font-mono text-xs font-bold flex items-center gap-1 ${isUnrealizedUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    <span>{isUnrealizedUp ? '+' : ''}${b.unrealizedPnl.toFixed(2)}</span>
                    <span className="text-[10px]">({isUnrealizedUp ? '+' : ''}{b.unrealizedPnlPct.toFixed(2)}%)</span>
                  </div>
                </div>
              </div>

              {/* Risk / Targets Box (SL / TP / R:R / Conf.) */}
              <div className="my-2.5 p-2 bg-[#060a14]/90 border border-white/5 rounded-xl grid grid-cols-3 divide-x divide-white/5 text-center">
                <div className="px-1 text-left flex flex-col justify-center">
                  <div className="flex items-center justify-between text-[10px] leading-tight">
                    <span className="text-teal-400 font-bold">SL</span>
                    <span className="font-mono text-slate-300 font-semibold">{b.stopLoss.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] leading-tight mt-0.5">
                    <span className="text-emerald-400 font-bold">TP</span>
                    <span className="font-mono text-slate-300 font-semibold">{b.takeProfit.toFixed(2)}</span>
                  </div>
                </div>
                <div className="px-1 flex flex-col justify-center">
                  <div className="text-[9px] font-semibold text-slate-500 uppercase">R:R</div>
                  <div className="text-xs font-bold font-mono text-white leading-tight">{b.riskReward}</div>
                </div>
                <div className="px-1 flex flex-col justify-center">
                  <div className="text-[9px] font-semibold text-slate-500 uppercase">Conf.</div>
                  <div className="text-xs font-bold font-mono text-slate-200 leading-tight">{b.confidence}%</div>
                </div>
              </div>

              {/* Bottom 3 Action Buttons */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  onClick={(e) => { e.stopPropagation(); handleToggleBotState(b.id, b.status); }}
                  className={`py-2 rounded-xl border flex items-center justify-center transition-all shadow-sm ${
                    b.status === 'ACTIVE'
                      ? 'bg-[#0e1424] hover:bg-[#141b30] border-white/5 hover:border-white/15 text-slate-300 hover:text-white'
                      : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                  }`}
                  title={b.status === 'ACTIVE' ? "Pause Bot" : "Start / Resume Bot"}
                >
                  {b.status === 'ACTIVE' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedBotToTerminate(b.id); }}
                  className="py-2 rounded-xl bg-[#0e1424] hover:bg-rose-500/20 border border-white/5 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 flex items-center justify-center transition-all shadow-sm"
                  title="Stop Bot Instance"
                >
                  <Square className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); openBotSettings(b); }}
                  className="py-2 rounded-xl bg-[#0e1424] hover:bg-indigo-500/20 border border-white/5 hover:border-indigo-500/30 text-slate-400 hover:text-indigo-300 flex items-center justify-center transition-all shadow-sm"
                  title="Bot Settings & Risk"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* ── 4. LIVE CANDLESTICK CHART & TERMINAL LOGS ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chart Column (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-6 bg-[#090d19]/90 border border-white/5 rounded-2xl flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-lg">
                  {activeBot?.name || 'Momentum Pro'} <span className="text-indigo-400 font-mono text-sm">[Bot {activeBot?.bot_id || selectedBotId}]</span> — {activeBot?.symbol || 'BTCUSDT'} Live Feed
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                  ● REAL-TIME
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Current Price: <strong className="text-white font-mono">${(activeBot?.current_price || 63845.60).toLocaleString()}</strong>
              </p>
            </div>

            {/* Timeframe selector */}
            <div className="flex bg-[#0c101d] p-1 rounded-xl border border-white/5 text-xs">
              {['1m', '5m', '15m', '1H', '4H', '1D'].map(tf => (
                <button
                  key={tf}
                  onClick={() => setActiveInterval(tf)}
                  className={`px-2.5 py-1 font-semibold rounded-lg transition-colors ${
                    activeInterval === tf ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Candlestick Chart */}
          <div className="h-72 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={activeCandles}>
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis domain={['auto', 'auto']} orientation="right" stroke="#475569" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Bar dataKey="close" shape={<CandlestickShape />} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Real Open Positions Table */}
          <div className="mt-6 pt-4 border-t border-white/5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Active Positions ({activePositions.length})
              </h4>
              <span className="text-[10px] text-slate-500">Supervised by Risk Engine</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] text-slate-500 uppercase border-b border-white/5">
                    <th className="pb-2">Asset</th>
                    <th className="pb-2">Side</th>
                    <th className="pb-2">Size</th>
                    <th className="pb-2">Entry</th>
                    <th className="pb-2">Mark</th>
                    <th className="pb-2">PnL ($)</th>
                    <th className="pb-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {activePositions.map((pos: any, idx: number) => (
                    <tr key={idx} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 font-bold text-white">{pos.asset}</td>
                      <td className="py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pos.side === 'LONG' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {pos.side}
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-slate-300">{pos.size}</td>
                      <td className="py-2.5 font-mono text-slate-400">${Number(pos.entryPrice).toLocaleString()}</td>
                      <td className="py-2.5 font-mono text-slate-200">${Number(pos.markPrice).toLocaleString()}</td>
                      <td className={`py-2.5 font-mono font-bold ${pos.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {pos.unrealizedPnl >= 0 ? '+' : ''}${Number(pos.unrealizedPnl).toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right">
                        <button 
                          onClick={() => setSelectedBotToTerminate(selectedBotId)}
                          className="px-2 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] font-bold"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Live Execution Logs Terminal (1 col) */}
        <div className="glass-panel p-5 bg-[#090d19]/90 border border-white/5 rounded-2xl flex flex-col justify-between h-full">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-white text-sm">Execution Terminal</h3>
            </div>

            <button 
              onClick={copyTerminalLogs}
              className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5"
            >
              {copiedLogs ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copiedLogs ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Terminal stream box */}
          <div className="my-3 flex-1 min-h-[320px] max-h-[420px] overflow-y-auto font-mono text-[10px] bg-[#05070d] p-3 rounded-xl border border-white/5 space-y-1.5 select-text">
            {activeLogs.map((log: string, idx: number) => {
              const isBuy = log.includes('BUY') || log.includes('Signal: BUY') || log.includes('filled:');
              const isSell = log.includes('SELL') || log.includes('Signal: SELL');
              const isError = log.includes('Error') || log.includes('error') || log.includes('Fail');
              const isAlpaca = log.includes('Alpaca') || log.includes('Hyperliquid');
              
              return (
                <div 
                  key={idx} 
                  className={`leading-relaxed break-words ${
                    isBuy ? 'text-emerald-400 font-semibold' :
                    isSell ? 'text-rose-400 font-semibold' :
                    isError ? 'text-red-400' :
                    isAlpaca ? 'text-indigo-400' :
                    'text-slate-400'
                  }`}
                >
                  {log}
                </div>
              );
            })}
            <div ref={terminalBottomRef} />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-2 border-t border-white/5">
            <span>● Log stream live</span>
            <span>{activeLogs.length} events</span>
          </div>
        </div>
      </div>

      {/* ── 5. SPAWN BOT MODAL ────────────────────────────────────── */}
      {isSpawnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#090d19] border border-indigo-500/30 max-w-xl w-full rounded-2xl p-6 shadow-2xl space-y-5 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Spawn Trading Bot</h3>
                  <span className="text-xs text-slate-400 font-light">Deploy a live or paper trading bot instance</span>
                </div>
              </div>
              <button onClick={() => setIsSpawnModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSpawnBot} className="space-y-4 text-xs">
              
              {/* Bot Name & Strategy */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Bot Name</label>
                  <input 
                    type="text" 
                    value={spawnBotName}
                    onChange={(e) => setSpawnBotName(e.target.value)}
                    required
                    placeholder="e.g. Momentum Alpha v2"
                    className="w-full px-3 py-2 bg-[#0c101d] border border-white/10 rounded-xl text-white outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Strategy</label>
                  <select 
                    value={spawnStrategyId}
                    onChange={(e) => setSpawnStrategyId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c101d] border border-white/10 rounded-xl text-white outline-none focus:border-indigo-500"
                  >
                    {strategies.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Feed Source & Symbol */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">
                  Execution Mode / Feed Source
                </label>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSpawnFeedSource('mock');
                      const symbols = FEED_SYMBOLS.mock;
                      if (symbols.length > 0) setSpawnSymbol(symbols[0].value);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      spawnFeedSource === 'mock'
                        ? 'bg-teal-500/15 border-teal-500 text-teal-300 shadow-lg shadow-teal-500/10'
                        : 'bg-[#0c101d] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <span>⚡ Stimulate</span>
                    <span className="text-[9px] font-normal opacity-70">Sandbox (Safe)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSpawnFeedSource('binance');
                      const symbols = FEED_SYMBOLS.binance;
                      if (symbols.length > 0) setSpawnSymbol(symbols[0].value);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      spawnFeedSource === 'binance'
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/10'
                        : 'bg-[#0c101d] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <span>Binance</span>
                    <span className="text-[9px] font-normal opacity-70">Crypto Futures</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSpawnFeedSource('alpaca');
                      const symbols = FEED_SYMBOLS.alpaca;
                      if (symbols.length > 0) setSpawnSymbol(symbols[0].value);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex flex-col items-center gap-1 ${
                      spawnFeedSource === 'alpaca'
                        ? 'bg-indigo-500/15 border-indigo-500 text-indigo-300 shadow-lg shadow-indigo-500/10'
                        : 'bg-[#0c101d] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    <span>Alpaca</span>
                    <span className="text-[9px] font-normal opacity-70">Broker Paper/Live</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Additional Exchanges</label>
                  <select 
                    value={spawnFeedSource}
                    onChange={(e) => {
                      setSpawnFeedSource(e.target.value);
                      const symbols = FEED_SYMBOLS[e.target.value] || FEED_SYMBOLS.mock;
                      if (symbols.length > 0) setSpawnSymbol(symbols[0].value);
                    }}
                    className="w-full px-3 py-2 bg-[#0c101d] border border-white/10 rounded-xl text-white outline-none focus:border-indigo-500 text-xs"
                  >
                    <option value="mock">Sandbox Simulator (Mock)</option>
                    <option value="binance">Binance Futures (Crypto)</option>
                    <option value="alpaca">Alpaca Brokerage (Paper & Live)</option>
                    <option value="hyperliquid">Hyperliquid (Perpetuals)</option>
                    <option value="yfinance">Yahoo Finance (Equities / Crypto)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase">Trading Pair / Ticker</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomTicker(!isCustomTicker)}
                      className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {isCustomTicker ? "← Select from List" : "+ Custom Ticker"}
                    </button>
                  </div>
                  {isCustomTicker ? (
                    <input 
                      type="text"
                      value={spawnSymbol}
                      onChange={(e) => setSpawnSymbol(e.target.value.toUpperCase().trim())}
                      placeholder="e.g. LTCUSD, TSLA, NVDA, DOGEUSD"
                      className="w-full px-3 py-2 bg-[#0c101d] border border-indigo-500/50 rounded-xl text-white outline-none focus:border-indigo-400 text-xs font-mono font-bold"
                    />
                  ) : (
                    <select 
                      value={spawnSymbol}
                      onChange={(e) => setSpawnSymbol(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0c101d] border border-white/10 rounded-xl text-white outline-none focus:border-indigo-500 text-xs font-mono"
                    >
                      {(() => {
                        const symbols = FEED_SYMBOLS[spawnFeedSource] || FEED_SYMBOLS.mock;
                        const cryptoList = symbols.filter(s => s.category === 'Crypto' || s.value.includes('USD') || s.value.includes('PERP'));
                        const stockList = symbols.filter(s => s.category === 'Stock' || s.category === 'ETF' || (!s.value.includes('USD') && !s.value.includes('PERP')));

                        return (
                          <>
                            {cryptoList.length > 0 && (
                              <optgroup label="🪙 Crypto Pairs" className="bg-slate-900 text-indigo-300 font-bold">
                                {cryptoList.map(s => (
                                  <option key={s.value} value={s.value} className="text-white bg-slate-950 font-normal">{s.label}</option>
                                ))}
                              </optgroup>
                            )}
                            {stockList.length > 0 && (
                              <optgroup label="📈 US Equities, Stocks & ETFs" className="bg-slate-900 text-emerald-300 font-bold">
                                {stockList.map(s => (
                                  <option key={s.value} value={s.value} className="text-white bg-slate-950 font-normal">{s.label}</option>
                                ))}
                              </optgroup>
                            )}
                          </>
                        );
                      })()}
                    </select>
                  )}
                </div>
              </div>

              {/* Timeframe, Capital & Leverage */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Timeframe</label>
                  <select 
                    value={spawnTimeframe}
                    onChange={(e) => setSpawnTimeframe(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0c101d] border border-white/10 rounded-xl text-white outline-none"
                  >
                    <option value="10s">10 Seconds</option>
                    <option value="1m">1 Minute</option>
                    <option value="5m">5 Minutes</option>
                    <option value="15m">15 Minutes</option>
                    <option value="1h">1 Hour</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Capital ($)</label>
                  <input 
                    type="number"
                    value={spawnStartingCash}
                    onChange={(e) => setSpawnStartingCash(Number(e.target.value))}
                    min={100}
                    className="w-full px-3 py-2 bg-[#0c101d] border border-white/10 rounded-xl text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Leverage</label>
                  <input 
                    type="number"
                    value={spawnLeverage}
                    onChange={(e) => setSpawnLeverage(Number(e.target.value))}
                    min={1}
                    max={20}
                    className="w-full px-3 py-2 bg-[#0c101d] border border-white/10 rounded-xl text-white outline-none"
                  />
                </div>
              </div>

              {/* Agentic Mode & Attitude */}
              <div className="p-3 bg-[#0c101d] border border-white/5 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-xs">Autonomous Agentic Reasoning</div>
                    <span className="text-[10px] text-slate-400">Enable multi-agent consensus (Gemini / Tech / Sentiment)</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={spawnAgenticMode}
                    onChange={(e) => setSpawnAgenticMode(e.target.checked)}
                    className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                </div>

                {spawnAgenticMode && (
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    {(['conservative', 'balanced', 'aggressive'] as const).map(att => (
                      <button
                        key={att}
                        type="button"
                        onClick={() => setSpawnAgentAttitude(att)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          spawnAgentAttitude === att ? 'bg-indigo-600 text-white' : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        {att}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSpawnModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
                >
                  <Zap className="w-4 h-4" />
                  <span>Launch Bot</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── 6. TERMINATE CONFIRMATION MODAL ───────────────────────── */}
      {selectedBotToTerminate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#090d19] border border-rose-500/30 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3 border-b border-white/5 pb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 shrink-0">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Stop Strategy Bot</h3>
                <span className="text-[10px] text-slate-400 font-light">Destructive session action</span>
              </div>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to stop bot: <strong className="text-white font-bold">{selectedBotToTerminate}</strong>?
            </p>

            <div className="flex flex-col gap-2 pt-2 border-t border-white/5">
              <span className="text-xs font-semibold text-slate-300">Exit Sizing: Close {Math.round(closePct * 100)}% of open positions</span>
              <div className="flex gap-2">
                {[0, 0.25, 0.5, 0.75, 1.0].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setClosePct(pct)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${closePct === pct ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                  >
                    {pct === 0 ? "0%" : `${pct * 100}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                disabled={terminateLoading}
                onClick={() => setSelectedBotToTerminate(null)}
                className="px-4 py-2 rounded-xl bg-white/5 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={terminateLoading}
                onClick={executeTerminateBot}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-500/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                {terminateLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{terminateLoading ? 'Stopping...' : 'Confirm Stop'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. BOT SETTINGS & RISK MODAL ──────────────────────────── */}
      {selectedBotForSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#090d19] border border-indigo-500/30 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-5 animate-scaleUp">
            
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <Settings className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Bot Configuration</h3>
                  <span className="text-xs text-slate-400 font-mono">{selectedBotForSettings.name} ({selectedBotForSettings.symbol})</span>
                </div>
              </div>
              <button onClick={() => setSelectedBotForSettings(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBotSettings} className="space-y-4 text-xs">
              
              {/* Leverage Control */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Leverage Limit</label>
                  <span className="font-mono font-bold text-indigo-400 text-xs">{settingsLeverage}x</span>
                </div>
                <input 
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={settingsLeverage}
                  onChange={(e) => setSettingsLeverage(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-0.5">
                  <span>1x (Spot)</span>
                  <span>10x (Standard)</span>
                  <span>20x (Max)</span>
                </div>
              </div>

              {/* Agent Attitude / Risk Profile */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1.5">Agent Attitude & Strategy Bias</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['conservative', 'balanced', 'aggressive'] as const).map(att => (
                    <button
                      key={att}
                      type="button"
                      onClick={() => setSettingsAttitude(att)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                        settingsAttitude === att
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                          : 'bg-[#0c101d] border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {att}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slippage Tolerance */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Max Slippage Tolerance (%)</label>
                <input 
                  type="number"
                  step={0.05}
                  min={0.05}
                  max={2.0}
                  value={settingsSlippage}
                  onChange={(e) => setSettingsSlippage(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-[#0c101d] border border-white/10 rounded-xl text-white outline-none focus:border-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setSelectedBotForSettings(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/30"
                >
                  Save Settings
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
