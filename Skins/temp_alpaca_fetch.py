import requests
import json

headers = {
    "APCA-API-KEY-ID": "PKM3K52OQ62SCBUQUKXMLLXYVF",
    "APCA-API-SECRET-KEY": "8pcocpsJsnvqZpBy5pjemeX5bLTo5PDzs3U2d7KYbAVk"
}
base_url = "https://paper-api.alpaca.markets"

# Get Account
acc_res = requests.get(f"{base_url}/v2/account", headers=headers)
account = acc_res.json()

# Get Positions
pos_res = requests.get(f"{base_url}/v2/positions", headers=headers)
positions = pos_res.json()

print(json.dumps({
    "account": account,
    "positions": positions
}, indent=2))
