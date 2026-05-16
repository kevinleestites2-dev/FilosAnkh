"""
bridge.py — LightAgent JSON-RPC Bridge for FilosAnkh

Called by engine.js via child_process.execSync.
Receives a JSON payload via argv[1], runs LightAgent, returns JSON response.

Usage:
    python3 bridge.py '<json_payload>'
"""

import sys
import json

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"reply": "No payload received.", "tool_calls": []}))
        return

    try:
        payload = json.loads(sys.argv[1])
    except json.JSONDecodeError as e:
        print(json.dumps({"reply": f"Payload parse error: {e}", "tool_calls": []}))
        return

    system   = payload.get("system", "")
    history  = payload.get("history", [])
    message  = payload.get("message", "")
    model    = payload.get("model", "llama3.1")
    base_url = payload.get("base_url", "")
    api_key  = payload.get("api_key", "ollama")
    temperature = payload.get("temperature", 0.7)

    try:
        from LightAgent import LightAgent

        agent = LightAgent(
            name="Filos",
            role=system,
            model=model,
            api_key=api_key,
            base_url=f"{base_url}/v1" if base_url else "",
            self_learning=True,
            tree_of_thought=False,
            stream=False,
            temperature=temperature,
        )

        # Build messages with history
        messages = []
        for turn in history:
            messages.append({"role": turn.get("role", "user"), "content": turn.get("content", "")})
        messages.append({"role": "user", "content": message})

        # Run the agent
        reply = agent.run(message)

        print(json.dumps({"reply": reply, "tool_calls": []}))

    except ImportError:
        # Fallback: use openai-compatible API directly
        try:
            import urllib.request

            messages = [{"role": "system", "content": system}]
            for turn in history:
                messages.append({"role": turn.get("role", "user"), "content": turn.get("content", "")})
            messages.append({"role": "user", "content": message})

            data = json.dumps({
                "model": model,
                "messages": messages,
                "temperature": temperature,
                "stream": False,
            }).encode()

            req = urllib.request.Request(
                f"{base_url}/v1/chat/completions",
                data=data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=60) as resp:
                result = json.loads(resp.read().decode())
                reply = result["choices"][0]["message"]["content"]
                print(json.dumps({"reply": reply, "tool_calls": []}))

        except Exception as e:
            print(json.dumps({"reply": f"Bridge error: {e}", "tool_calls": []}))

    except Exception as e:
        print(json.dumps({"reply": f"LightAgent error: {e}", "tool_calls": []}))


if __name__ == "__main__":
    main()
