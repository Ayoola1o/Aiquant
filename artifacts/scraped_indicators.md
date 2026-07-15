# 📊 Scraped Technical Indicators Reference Guide

This document lists all the technical indicators scraped directly from the official **Jesse Indicators Reference** web page: [https://docs.jesse.trade/docs/indicators/reference](https://docs.jesse.trade/docs/indicators/reference).

| Indicator Name | Function Signature | Platform Support Status |
| :--- | :--- | :--- |
| acosc ​ | `acosc(candles: np.ndarray, sequential=False) -> AC` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| ad ​ | `ad(candles: np.ndarray, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| adosc ​ | `adosc(candles: np.ndarray, fast_period=3, slow_period=10, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| adx ​ | `adx(candles: np.ndarray, period=14, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| adxr ​ | `adxr(candles: np.ndarray, period=14, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| alligator ​ | `alligator(candles: np.ndarray, source_type="close", sequential=False) -> AG` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| alma ​ | `alma(candles: np.ndarray, period: int = 9, sigma: float = 6.0, distribution_offset: float = 0.85, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| ao ​ | `ao(candles: np.ndarray, sequential=False) -> AO` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| apo ​ | `apo(candles: np.ndarray, fast_period=12, slow_period=26, matype=0, source_type="close", sequential=False) -> Union[` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| aroon ​ | `aroon(candles: np.ndarray, period=14, sequential=False) -> AROON` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| aroonosc ​ | `aroonosc(candles: np.ndarray, period=14, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| atr ​ | `atr(candles: np.ndarray, period=14, sequential=False) -> Union[float, np.ndarray]` | ✅ Supported Natively (`aiquant.indicators` package) |
| avgprice ​ | `avgprice(candles: np.ndarray, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| beta ​ | `beta(candles: np.ndarray, benchmark_candles: np.ndarray, period: int = 5, sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| bandpass ​ | `bandpass(candles: np.ndarray, period: int = 20, bandwidth: float = 0.3, source_type: str = "close", sequential: bool = False) -> BandPass` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| bollinger_bands ​ | `bollinger_bands(candles: np.ndarray, period=20, devup=2, devdn=2, matype=0, devtype=0, source_type="close", sequential=False) -> BollingerBands` | ✅ Supported Natively (`aiquant.indicators` package) |
| bollinger_bands_width ​ | `bollinger_bands_width(candles: np.ndarray, period=20, mult=2, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| bop ​ | `bop(candles: np.ndarray, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| cc ​ | `cc(candles: np.ndarray, wma_period=10, roc_short_period=11, roc_long_period=14, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| cci ​ | `cci(candles: np.ndarray, period=14, sequential=False) -> Union[float, np.ndarray]` | ✅ Supported Natively (`aiquant.indicators` package) |
| cfo ​ | `cfo(candles: np.ndarray, period: int = 14, scalar: float = 100, source_type: str = "close", squential: bool = False) -> Union[float, np.ndarray]:` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| cg ​ | `cg(candles: np.ndarray, period: int = 10, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| cksp ​ | `cksp(candles: np.ndarray, p: int = 10, x: float = 1.0, q: int = 9, sequential: bool = False) -> CKSP` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| chande ​ | `chande(candles: np.ndarray, period=22, mult=3.0, direction="long", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| chop ​ | `chop(candles: np.ndarray, period: int = 14, scalar: float = 100, drift: int = 1, sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| cmo ​ | `cmo(candles: np.ndarray, period=14, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| correlation_cycle ​ | `correlation_cycle(candles: np.ndarray, period=20, threshold=9, source_type="close", sequential=False) -> CC` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| correl ​ | `correl(candles: np.ndarray, period=5, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| cvi ​ | `cvi(candles: np.ndarray, period=5, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| cwma ​ | `cwma(candles: np.ndarray, period: int = 14, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| damiani_volatmeter ​ | `damiani_volatmeter(candles: np.ndarray, vis_atr=13, vis_std=20, sed_atr=40, sed_std=100, threshold=1.4, source_type="close", sequential=False) -> DamianiVolatmeter` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| decycler ​ | `decycler(candles: np.ndarray, hp_period=125, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| dec_osc ​ | `dec_osc(candles: np.ndarray, hp_period=125, k=1, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| dema ​ | `dema(candles: np.ndarray, period=30, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| devstop ​ | `devstop(candles: np.ndarray, period:int=20, mult: float = 0, devtype: int = 0, direction: str = "long", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| di ​ | `di(candles: np.ndarray, period=14, sequential=False) -> DI` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| dm ​ | `dm(candles: np.ndarray, period=14, sequential=False) -> DM` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| donchian ​ | `donchian(candles: np.ndarray, period=20, sequential=False) -> DonchianChannel` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| dpo ​ | `dpo(candles: np.ndarray, period=5, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| dti ​ | `dti(candles: np.ndarray, r=14, s=10, u=5, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| dx ​ | `dx(candles: np.ndarray, di_length=14, adx_smoothing=14,sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| edcf ​ | `edcf(candles: np.ndarray, period: int = 15, source_type: str = "hl2", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| efi ​ | `efi(candles: np.ndarray, period=13, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| ema ​ | `ema(candles: np.ndarray, period=5, source_type="close", sequential=False) -> Union[float, np.ndarray]` | ✅ Supported Natively (`aiquant.indicators` package) |
| emd ​ | `emd(candles: np.ndarray, period=20, delta=0.5, fraction=0.1, sequential=False) -> EMD` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| emv ​ | `emv(candles: np.ndarray, length=14, div=10000, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| epma ​ | `epma(candles: np.ndarray, period: int = 11, offset: int = 4, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| er ​ | `er(candles: np.ndarray, period: int = 5, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]:` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| eri ​ | `eri(candles: np.ndarray, period: int = 13, matype: int = 1, source_type: str = "close", sequential: bool = False) -> ERI` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| fisher ​ | `fisher(candles: np.ndarray, period=9, sequential=False) -> FisherTransform` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| fosc ​ | `fosc(candles: np.ndarray, period=5, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| frama ​ | `frama(candles: np.ndarray, window=10, FC=1, SC=300, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| fwma ​ | `fwma(candles: np.ndarray, period: int = 5, source_type: str = "close",sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| gatorosc ​ | `gatorosc(candles: np.ndarray, source_type="close", sequential=False) -> GATOR` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| gauss ​ | `gauss(candles: np.ndarray, period=14, poles=4, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| heikin_ashi_candles ​ | `heikin_ashi_candles(candles: np.ndarray, sequential=False) -> HA` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| high_pass ​ | `high_pass(candles: np.ndarray, period=48, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| high_pass_2_pole ​ | `high_pass_2_pole(candles: np.ndarray, period=48, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| hma ​ | `hma(candles: np.ndarray, period=5, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| hurst_exponent ​ | `hurst_exponent(candles: np.ndarray, min_chunksize: int = 8, max_chunksize: int = 200, num_chunksize: int = 5, method: int = 1, source_type: str = "close") -> float` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| hwma ​ | `hwma(candles: np.ndarray, na: float = 0.2, nb: float = 0.1, nc: float = 0.1, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| ichimoku_cloud ​ | `ichimoku_cloud(candles: np.ndarray, conversion_line_period=9, base_line_period=26, lagging_line_period=52, displacement=26) -> IchimokuCloud` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| ichimoku_cloud_seq ​ | `ichimoku_cloud_seq(candles: np.ndarray, conversion_line_period=9, base_line_period=26, lagging_line_period=52,displacement=26, sequential=False) -> IchimokuCloud` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| ift_rsi ​ | `ift_rsi(candles: np.ndarray, rsi_period: int = 5, wma_period: int =9, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| itrend ​ | `itrend(candles: np.ndarray, alpha=0.07, source_type="hl2", sequential=False) -> ITREND` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| jma ​ | `jma(candles: np.ndarray, period:int=7, phase:float=50, power:int=2, source_type:str='close', sequential:bool=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| jsa ​ | `jsa(candles: np.ndarray, period: int = 30, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| kama ​ | `kama(candles: np.ndarray, period=30, fast_length=2, slow_length=30, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| kaufmanstop ​ | `kaufmanstop(candles: np.ndarray, period: int = 22, mult: float = 2, direction: str = "long", matype: int = 0,  sequential: bool = False) -> Union[ float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| kdj ​ | `kdj(candles: np.ndarray, fastk_period: int = 9, slowk_period: int = 3, slowk_matype: int = 0, slowd_period: int = 3, slowd_matype: int = 0, sequential: bool = False) -> KDJ` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| keltner ​ | `keltner(candles: np.ndarray, period=20, multiplier=2, matype=1, source_type="close", sequential=False) -> KeltnerChannel` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| kst ​ | `kst(candles: np.ndarray, sma_period1=10, sma_period2=10, sma_period3=10, sma_period4=15, roc_period1=10, roc_period2=15, roc_period3=20, roc_period4=30, signal_period=9, source_type="close", sequential=False) -> KST:` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| kurtosis ​ | `kurtosis(candles: np.ndarray, period: int = 5, source_type: str = "hl2", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| kvo ​ | `kvo(candles: np.ndarray, short_period=34, long_period=55, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| linearreg ​ | `linearreg(candles: np.ndarray, period=14, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| linearreg_angle ​ | `linearreg_angle(candles: np.ndarray, period=14, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| linearreg_intercept ​ | `linearreg_intercept(candles: np.ndarray, period=14, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| linearreg_slope ​ | `linearreg_slope(candles: np.ndarray, period=14, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| lrsi ​ | `lrsi(candles: np.ndarray, alpha=0.2, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| ma ​ | `ma(candles: np.ndarray, period: int = 30, matype: int = 0,  source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]:` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| maaq ​ | `maaq(candles: np.ndarray, period: int = 11, fast_period: int = 2, slow_period: int = 30, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| mab ​ | `mab(candles: np.ndarray, fast_period: int = 10, slow_period: int = 50, devup: float = 1, devdn: float = 1, fast_matype: int = 0, slow_matype: int = 0, source_type: str = "close", sequential: bool = False) -> MAB` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| macd ​ | `macd(candles: np.ndarray, fast_period=12, slow_period=26, signal_period=9, source_type="close", sequential=False) -> MACD` | ✅ Supported Natively (`aiquant.indicators` package) |
| mama ​ | `mama(candles: np.ndarray, fastlimit=0.5, slowlimit=0.05, source_type="close", sequential=False) -> MAMA` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| marketfi ​ | `marketfi(candles: np.ndarray, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| mass ​ | `mass(candles: np.ndarray, period=5, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| mcginley_dynamic ​ | `mcginley_dynamic(candles: np.ndarray, period=10, k=0.6, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| mean_ad ​ | `mean_ad(candles: np.ndarray, period: int = 5, source_type: str = "hl2", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| median_ad ​ | `median_ad(candles: np.ndarray, period: int = 5, source_type: str = "hl2", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| medprice ​ | `medprice(candles: np.ndarray, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| mfi ​ | `mfi(candles: np.ndarray, period=14, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| midpoint ​ | `midpoint(candles: np.ndarray, period=14, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| midprice ​ | `midprice(candles: np.ndarray, period=14, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| minmax ​ | `minmax(candles: np.ndarray, order=3, sequential=False) -> EXTREMA` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| mom ​ | `mom(candles: np.ndarray, period=10, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| mwdx ​ | `mwdx(candles: np.ndarray, factor: float = 0.2, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| natr ​ | `natr(candles: np.ndarray, period=14, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| nma ​ | `nma(candles: np.ndarray, period: int = 40, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| nvi ​ | `nvi(candles: np.ndarray, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| obv ​ | `obv(candles: np.ndarray, sequential=False) -> Union[float, np.ndarray]` | ✅ Supported Natively (`aiquant.indicators` package) |
| pfe ​ | `pfe(candles: np.ndarray, period: int = 10, smoothing: int = 5, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| pivot ​ | `pivot(candles: np.ndarray, mode=0, sequential=False) -> PIVOT` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| pma ​ | `pma(candles: np.ndarray, source_type: str = "hl2", sequential: bool = False) -> PMA` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| ppo ​ | `ppo(candles: np.ndarray, fast_period=12, slow_period=26, matype=0, source_type="close", sequential=False) -> Union[` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| pvi ​ | `pvi(candles: np.ndarray, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| pwma ​ | `pwma(candles: np.ndarray, period: int = 5, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| qstick ​ | `qstick(candles: np.ndarray, period=5, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| reflex ​ | `reflex(candles: np.ndarray, period=20, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| roc ​ | `roc(candles: np.ndarray, period=10, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| rocp ​ | `rocp(candles: np.ndarray, period=10, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| rocr ​ | `rocr(candles: np.ndarray, period=10, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| rocr100 ​ | `rocr100(candles: np.ndarray, period=10, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| roofing ​ | `roofing(candles: np.ndarray, hp_period=48, lp_period=10, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| rsi ​ | `rsi(candles: np.ndarray, period=14, source_type="close", sequential=False) -> Union[float, np.ndarray]` | ✅ Supported Natively (`aiquant.indicators` package) |
| rsmk ​ | `rsmk(candles: np.ndarray, candles_compare: np.ndarray, lookback: int = 90, period: int = 3, signal_period: int = 20, source_type: str = "close", sequential: bool = False) -> RSMK` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| rsx ​ | `rsx(candles: np.ndarray, period=14, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| rvi ​ | `rvi(candles: np.ndarray, period: int = 10, ma_len: int = 14, matype: int = 1, devtype: int = 0, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| safezonestop ​ | `safezonestop(candles: np.ndarray, period: int = 22, mult: float = 2.5, max_lookback: int = 3, direction: str = "long", sequential: bool = False) -> Union[float, np.ndarray]:` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| sar ​ | `sar(candles: np.ndarray, acceleration=0.02, maximum=0.2, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| sinwma ​ | `sinwma(candles: np.ndarray, period: int = 14, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| skew ​ | `skew(candles: np.ndarray, period: int = 5, source_type: str = "hl2", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| sma ​ | `sma(candles: np.ndarray, period=5, source_type="close", sequential=False) -> Union[float, np.ndarray]` | ✅ Supported Natively (`aiquant.indicators` package) |
| smma ​ | `smma(candles: np.ndarray, period=5, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| sqwma ​ | `sqwma(candles: np.ndarray, period: int = 14, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| srsi ​ | `srsi(candles: np.ndarray, period=14, source_type="close", sequential=False) -> StochasticRSI` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| srwma ​ | `srwma(candles: np.ndarray, period: int = 14, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| stc ​ | `stc(candles: np.ndarray, fast_period: int = 23, fast_matype: int = 1, slow_period: int = 50, slow_matype: int = 1, k_period: int = 10, d_period: int = 3, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| stiffness ​ | `stiffness(candles: np.ndarray, ma_length: int = 100, stiff_length: int = 60, stiff_smooth: int = 3, source_type: str = "close")` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| stddev ​ | `stddev(candles: np.ndarray, period=5, nbdev=1, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| stoch ​ | `stoch(candles: np.ndarray, fastk_period=14, slowk_period=3, slowk_matype=0, slowd_period=3, slowd_matype=0, sequential=False) -> Stochastic` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| stochf ​ | `stochf(candles: np.ndarray, fastk_period=5, fastd_period=3, fastd_matype=0, sequential=False) -> StochasticFast` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| supersmoother ​ | `supersmoother(candles: np.ndarray, period=14, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| supersmoother_3_pole ​ | `supersmoother_3_pole(candles: np.ndarray, period=14, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| swma ​ | `swma(candles: np.ndarray, period: int = 5, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| supertrend ​ | `supertrend(candles: np.ndarray, period=10, factor=3, sequential=False) -> SuperTrend` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| support_resistance_with_breaks ​ | `support_resistance_with_breaks(candles: np.ndarray, left_bars: int = 15, right_bars: int = 15, vol_threshold: int = 20) -> SupportResistanceWithBreaks` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| t3 ​ | `t3(candles: np.ndarray, period=5, vfactor=0, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| tema ​ | `tema(candles: np.ndarray, period=9, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| trange ​ | `trange(candles: np.ndarray, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| trendflex ​ | `trendflex(candles: np.ndarray, period=20, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| trima ​ | `trima(candles: np.ndarray, period=30, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| trix ​ | `trix(candles: np.ndarray, period=18, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| tsf ​ | `tsf(candles: np.ndarray, period=14, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| tsi ​ | `tsi(candles: np.ndarray, long_period=25, short_period=13, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| ttm_trend ​ | `ttm_trend(candles: np.ndarray, period: int = 5, source_type: str = "hl2", sequential: bool = False) -> Union[bool, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| ttm_squeeze (TTM Squeeze) ​ | `ttm_squeeze(candles: np.ndarray, length_ttms: int = 20, bb_mult_ttms: float = 2.0, kc_mult_low_ttms: float = 2.0) -> bool` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| typprice ​ | `typprice(candles: np.ndarray, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| ui ​ | `ui(candles: np.ndarray, period: int = 14, scalar: float = 100, source_type: str = "close",  sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| ultosc ​ | `ultosc(candles: np.ndarray, timeperiod1=7, timeperiod2=14, timeperiod3=28, sequential=False) -> Union[` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| var ​ | `var(candles: np.ndarray, period=14, nbdev=1, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| vi ​ | `vi(candles: np.ndarray, period=14, sequential=False) -> VI` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| vidya ​ | `vidya(candles: np.ndarray, length: int = 9, fix_cmo: bool = True, select: bool = True, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| vpci ​ | `vpci(candles: np.ndarray, short_range=5, long_range=25, sequential=False) -> VPCI` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| vlma ​ | `vlma(candles: np.ndarray, min_period: int = 5, max_period: int = 50, matype: int = 0, devtype: int = 0, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| vosc ​ | `vosc(candles: np.ndarray, short_period=2, long_period=5, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| voss ​ | `voss(candles: np.ndarray, period=20, predict=3, bandwith=0.25, source_type="close", sequential=False) -> VossFilter` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| vpt ​ | `vpt(candles: np.ndarray, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| vpwma ​ | `vpwma(candles: np.ndarray, period: int = 14, power: float = 0.382, source_type: str = "close", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| vwap ​ | `vwap(candles: np.ndarray, source_type: str = "hlc3", anchor: str = "D", sequential: bool = False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| vwma ​ | `vwma(candles: np.ndarray, period=20, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| vwmacd ​ | `vwmacd(candles: np.ndarray, fast_period=12, slow_period=26, signal_period=9, sequential=False) -> VWMACD` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| wad ​ | `wad(candles: np.ndarray, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| Waddah Attar Explosion ​ | `waddah_attar_explosion(candles, sensitivity=150,=20, slow_length=40,_length=20, mult=20,="close")` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| wclprice ​ | `wclprice(candles: np.ndarray, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| wilders ​ | `wilders(candles: np.ndarray, period=5, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| willr ​ | `willr(candles: np.ndarray, period=14, sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| wma ​ | `wma(candles: np.ndarray, period=30, source_type="close", sequential=False) -> Union[float, np.ndarray]` | ✅ Supported Natively (`aiquant.indicators` package) |
| wt ​ | `wt(candles: np.ndarray, wtchannellen: int = 9, wtaveragelen: int = 12, wtmalen: int = 3, oblevel: int = 53,  oslevel: int = -53, source_type: str = "hlc3", sequential: bool = False) -> Wavetrend` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| zlema ​ | `zlema(candles: np.ndarray, period=20, source_type="close", sequential=False) -> Union[float, np.ndarray]` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| zscore ​ | `zscore(candles: np.ndarray, period=14, matype=0, nbdev=1, devtype: int = 0, source_type="close", sequential=False) -> Union[` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
| volume ​ | `volume(candles: np.ndarray, period: int = 20, sequential: bool = False) -> Volume` | 🔄 Supported via TA-Lib / Pandas fallback mapping |
