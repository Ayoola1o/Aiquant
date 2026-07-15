import requests

def test_hyperliquid():
    url = "https://api.hyperliquid.xyz/info"
    headers = {"Content-Type": "application/json"}
    
    # Get meta data (contains universe of coins)
    payload = {"type": "meta"}
    res = requests.post(url, headers=headers, json=payload)
    print("Meta response status:", res.status_code)
    meta_data = res.json()
    
    # Get metaAndAssetCtxs (contains funding, OI, etc)
    payload = {"type": "metaAndAssetCtxs"}
    res2 = requests.post(url, headers=headers, json=payload)
    print("AssetCtx response status:", res2.status_code)
    
    if res2.status_code == 200:
        data = res2.json()
        print("Received data type:", type(data))
        if isinstance(data, list) and len(data) > 1:
            universe = data[0].get("universe", [])
            asset_ctxs = data[1]
            
            # Find BTC
            for i, asset in enumerate(universe):
                if asset.get("name") == "BTC":
                    ctx = asset_ctxs[i]
                    print("BTC Context:")
                    print("Funding Rate:", ctx.get("funding"))
                    print("Open Interest:", ctx.get("openInterest"))
                    print("Day Ntl Volume:", ctx.get("dayNtlVlm"))
                    break

if __name__ == "__main__":
    test_hyperliquid()
