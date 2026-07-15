import os
import subprocess
import json
from typing import List
from google.adk.tools.function_tool import FunctionTool

def senpi_smart_money() -> str:
    """
    Analyzes where smart money (profitable whales) are positioned vs the crowd on Hyperliquid.
    Returns JSON describing divergences and biases. Use this to determine if whales are bullish or bearish.
    """
    try:
        script = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "senpi-skills", "senpi-smart-money", "scripts", "smartmoney.py"))
        if not os.path.exists(script):
            return "Senpi smartmoney script not found."
        res = subprocess.run(["python3", script, "cohorts"], capture_output=True, text=True)
        return res.stdout
    except Exception as e:
        return f"Error running smart money engine: {str(e)}"

def senpi_market_pulse() -> str:
    """
    Analyzes the overall market context (crypto, equities, macro) to determine current regime.
    Returns JSON describing market conditions. Use this to check overall market health before trading.
    """
    try:
        script = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "senpi-skills", "senpi-market-pulse", "scripts", "pulse.py"))
        if not os.path.exists(script):
            return "Senpi market-pulse script not found."
        res = subprocess.run(["python3", script], capture_output=True, text=True)
        return res.stdout
    except Exception as e:
        return f"Error running market pulse engine: {str(e)}"

def senpi_deploy_strategy(strategy_id: str, budget_usd: int) -> str:
    """
    Deploys a Senpi trading strategy template (e.g. 'whalehunter', 'spider', 'polar') using senpi-strategy-ops.
    This creates wallets and sets up the autonomous trading engine on Hyperliquid.
    Arguments:
    - strategy_id: The name of the strategy template to deploy.
    - budget_usd: The amount of USD margin to allocate to this strategy.
    """
    try:
        script = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "senpi-skills", "senpi-strategy-ops", "scripts", "deploy.py"))
        if not os.path.exists(script):
            return "Senpi deploy script not found."
        
        create_res = subprocess.run(["python3", script, "create", strategy_id, "--budget", str(budget_usd)], capture_output=True, text=True)
        runtime_res = subprocess.run(["python3", script, "runtime", strategy_id], capture_output=True, text=True)
        
        return f"Deploy Output:\nCreate Step:\n{create_res.stdout}\nRuntime Step:\n{runtime_res.stdout}"
    except Exception as e:
        return f"Error deploying strategy: {str(e)}"

def load_senpi_skills(skills_dir: str = "senpi-skills") -> List[FunctionTool]:
    """
    Returns the initialized Senpi ADK FunctionTools.
    """
    return [
        FunctionTool(senpi_smart_money),
        FunctionTool(senpi_market_pulse),
        FunctionTool(senpi_deploy_strategy)
    ]
