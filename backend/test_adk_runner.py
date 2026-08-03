import asyncio
import os
import sys
import time

# Ensure current directory is in path
sys.path.append(os.path.dirname(__file__))

import adk_agent

async def test_run():
    print("==============================================================")
    print("[START] STARTING ADK COGNITIVE PIPELINE TEST RUN")
    print("==============================================================")

    # Load .env file manually
    if os.path.exists(".env"):
        with open(".env") as f:
            for line in f:
                if line.strip() and not line.strip().startswith("#") and "=" in line:
                    k, v = line.strip().split("=", 1)
                    os.environ[k.strip()] = v.strip()

    # Mock/Patch Gemini model generation to run offline without DNS/network requirements
    from google.adk.models import Gemini, LlmResponse
    from google.genai import types
    import json

    async def mock_generate_content_async(self, llm_request, stream=False):
        schema = getattr(llm_request.config, "response_schema", None)
        schema_name = schema.__name__ if schema else ""
        
        mock_data = {}
        if schema_name == "AnalystSignal":
            mock_data = {
                "signal": "BULLISH",
                "confidence": 0.85,
                "rationale": "Strong indicators with moving averages alignment and high whale volume."
            }
        elif schema_name == "DebateThesis":
            prompt_str = str(llm_request.contents)
            if "BullResearcher" in prompt_str or "BULLISH" in prompt_str or "strongest possible BULLISH thesis" in prompt_str:
                mock_data = {
                    "stance": "BULLISH",
                    "key_arguments": ["Strong institutional accumulation", "Support levels holding"],
                    "counter_arguments_rebuttal": "dilution concerns are minor"
                }
            else:
                mock_data = {
                    "stance": "BEARISH",
                    "key_arguments": ["Daily RSI is overbought", "Leverage flush risk"],
                    "counter_arguments_rebuttal": "Growth active addresses decline"
                }
        elif schema_name == "MarketView":
            mock_data = {
                "direction": "BULLISH",
                "probability": 0.75,
                "consensus_summary": "Consensus aligns on a strong bullish continuation setup."
            }
        elif schema_name == "AgentProposal":
            mock_data = {
                "action": "BUY",
                "entry_price": 120.5,
                "stop_loss": 115.0,
                "take_profit": 135.0,
                "direction": "LONG",
                "confidence": 0.85,
                "rationale": "Bullish thesis confirmed with optimal entries."
            }
        elif schema_name == "SupervisorDecision":
            mock_data = {
                "status": "APPROVED",
                "risk_assessment": "Stop-loss conforms to maximum drawdown rules.",
                "max_allocation_usd": 450.0,
                "validated_order": {
                    "action": "BUY",
                    "entry_price": 120.5,
                    "stop_loss": 115.0,
                    "take_profit": 135.0,
                    "direction": "LONG",
                    "confidence": 0.85,
                    "rationale": "Bullish thesis confirmed with optimal entries."
                }
            }
        elif schema_name == "PortfolioDecision":
            mock_data = {
                "final_action": "EXECUTE",
                "allocation_pct": 3.0,
                "execution_notes": "Allocation execution approved.",
                "approved_order": {
                    "action": "BUY",
                    "entry_price": 120.5,
                    "stop_loss": 115.0,
                    "take_profit": 135.0,
                    "direction": "LONG",
                    "confidence": 0.85,
                    "rationale": "Bullish thesis confirmed with optimal entries."
                }
            }
        else:
            mock_data = {"result": "ok"}

        content = types.Content(
            role="model",
            parts=[types.Part(text=json.dumps(mock_data))]
        )
        yield LlmResponse(content=content)

    Gemini.generate_content_async = mock_generate_content_async

    # Fetch API Key from environment
    gemini_key = os.environ.get("GEMINI_API_KEY", "")
    if not gemini_key:
        print("[WARNING] GEMINI_API_KEY not found in environment!")
        print("Please set GEMINI_API_KEY environment variable to test live LLM calls.")
        print("We will attempt to execute, but it may fail if not authorized.")
        print("--------------------------------------------------------------")
    
    # Mock symbol and account profile parameters
    ticker = "MTNN"
    account_profile = {
        "balance": 15000.0,
        "drawdown_limit": 4.5,
        "max_allocation_pct": 3.0
    }
    
    print(f"Auditing Asset: {ticker}")
    print(f"Parameters: {account_profile}")
    print("Executing sequential agents pipeline (Analysis -> Risk Supervisor)...")
    
    start_time = time.perf_counter()
    
    result = await adk_agent.run_adk_validation(
        ticker=ticker,
        gemini_api_key=gemini_key,
        account_profile=account_profile
    )
    
    end_time = time.perf_counter()
    latency_ms = (end_time - start_time) * 1000
    
    print("==============================================================")
    print("[FINISHED] PIPELINE EXECUTION COMPLETE")
    print("==============================================================")
    print(f"Latency: {latency_ms:.2f} ms")
    print(f"Final Decision Status: {result.get('final_action')}")
    print(f"Allocation Percentage: {result.get('allocation_pct')}")
    print(f"Execution Notes / Assessment: {result.get('execution_notes')}")
    print(f"Approved Order Object: {result.get('approved_order')}")
    print("--------------------------------------------------------------")
    print("Thoughts / Logs:")
    for thought in result.get("thoughts", []):
        print(f"  * {thought}")
    print("==============================================================")

if __name__ == "__main__":
    asyncio.run(test_run())
