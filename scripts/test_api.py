"""Teste rápido do endpoint /generate do microserviço."""

import urllib.request
import urllib.error
import json

data = {
    "presentation_title": "Teste API",
    "slides": [
        {"layout": "cover", "title": "Teste Cover", "subtitle": "Subtítulo", "date": "2026"},
        {"layout": "content", "title": "Conteúdo", "bullets": ["Bullet 1", "Bullet 2", "Bullet 3"]},
        {"layout": "key_metrics", "title": "Métricas", "metrics": [
            {"label": "Receita", "value": "R$ 2,1 bi", "variation": "+15%"},
            {"label": "EBITDA", "value": "R$ 800 mi", "variation": "+22%"},
        ]},
        {"layout": "table", "title": "Tabela", "table": {
            "headers": ["Métrica", "2023", "2024"],
            "rows": [["Receita", "R$ 1,0 bi", "R$ 1,5 bi"]]
        }},
        {"layout": "closing", "title": "Obrigado"},
    ],
}

body = json.dumps(data).encode("utf-8")
req = urllib.request.Request(
    "http://localhost:8000/generate",
    data=body,
    headers={"Content-Type": "application/json"},
    method="POST",
)

try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        content = resp.read()
        print(f"Status: {resp.status}")
        print(f"Content-Type: {resp.headers.get('Content-Type')}")
        print(f"Size: {len(content)} bytes ({len(content)/1024:.1f} KB)")

        with open("output_api_test.pptx", "wb") as f:
            f.write(content)
        print("Arquivo salvo: output_api_test.pptx")
except urllib.error.HTTPError as e:
    print(f"Erro HTTP {e.code}: {e.read().decode()}")
except urllib.error.URLError as e:
    print(f"Erro de conexão: {e.reason}")
