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
    print(f"Final Decision Status: {result.get('status')}")
    print(f"Risk Audit Assessment: {result.get('risk_assessment')}")
    print(f"Validated Order Object: {result.get('validated_order')}")
    print("--------------------------------------------------------------")
    print("Thoughts / Logs:")
    for thought in result.get("thoughts", []):
        print(f"  * {thought}")
    print("==============================================================")

if __name__ == "__main__":
    asyncio.run(test_run())
