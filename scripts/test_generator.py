"""
Script de teste para validar o generator de PPTX.
Gera uma apresentação de exemplo com todos os tipos de slide.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "pptx-service"))
from generator import IBPresentationGenerator


SAMPLE_DATA = {
    "presentation_title": "Produtos Mobile Itaú - Análise Estratégica 2024",
    "slides": [
        {
            "layout": "cover",
            "title": "Produtos Mobile do Itaú Unibanco",
            "subtitle": "Análise Estratégica e Performance 2024",
            "date": "Fevereiro 2026",
        },
        {
            "layout": "content",
            "title": "Visão Geral do Mercado de Mobile Banking",
            "bullets": [
                "O mercado de mobile banking no Brasil atingiu 184 milhões de contas ativas em 2024, crescimento de 18% YoY",
                "Itaú lidera o ranking com 35,2 milhões de usuários ativos mensais no app (+22% vs 2023)",
                "Transações via mobile representam 72% do total de operações bancárias do Itaú",
                "NPS do app Itaú atingiu 78 pontos, 12 pontos acima da média do setor",
                "Investimento em tecnologia: R$ 3,4 bilhões em 2024 (+15% YoY)",
            ],
        },
        {
            "layout": "key_metrics",
            "title": "Indicadores-Chave de Performance Mobile",
            "metrics": [
                {"label": "Usuários Ativos", "value": "35,2 mi", "variation": "+22% YoY"},
                {"label": "Transações/mês", "value": "1,8 bi", "variation": "+31% YoY"},
                {"label": "Receita Digital", "value": "R$ 4,2 bi", "variation": "+28% YoY"},
                {"label": "NPS App", "value": "78 pts", "variation": "+8 pts YoY"},
            ],
        },
        {
            "layout": "table",
            "title": "Demonstração de Resultados - Segmento Digital",
            "table": {
                "headers": ["Métrica", "2022", "2023", "2024", "Var YoY"],
                "rows": [
                    ["Receita Líquida", "R$ 2,1 bi", "R$ 3,3 bi", "R$ 4,2 bi", "+27,3%"],
                    ["EBITDA", "R$ 680 mi", "R$ 1,1 bi", "R$ 1,5 bi", "+36,4%"],
                    ["Margem EBITDA", "32,4%", "33,3%", "35,7%", "+2,4 p.p."],
                    ["Lucro Líquido", "R$ 420 mi", "R$ 710 mi", "R$ 980 mi", "+38,0%"],
                    ["CAC Digital", "R$ 45", "R$ 38", "R$ 32", "-15,8%"],
                    ["LTV/CAC", "4,2x", "5,1x", "6,3x", "+23,5%"],
                ],
            },
        },
        {
            "layout": "chart",
            "title": "Evolução da Receita Digital (R$ bilhões)",
            "chart_type": "bar",
            "chart_data": {
                "categories": ["2020", "2021", "2022", "2023", "2024"],
                "series": [
                    {"name": "Receita Digital", "values": [0.9, 1.4, 2.1, 3.3, 4.2]},
                ],
            },
        },
        {
            "layout": "two_columns",
            "title": "Análise Competitiva - Mobile Banking",
            "left_column": {
                "subtitle": "Pontos Fortes",
                "bullets": [
                    "Maior base de usuários entre bancos tradicionais",
                    "Plataforma de investimentos integrada (íon)",
                    "Super app com +200 funcionalidades",
                    "Parcerias com fintechs (Iti, Avenue)",
                ],
            },
            "right_column": {
                "subtitle": "Desafios",
                "bullets": [
                    "Competição com Nubank (98 mi clientes)",
                    "Custo de aquisição vs bancos digitais",
                    "Migração de clientes legacy para digital",
                    "Regulação Open Banking em evolução",
                ],
            },
        },
        {
            "layout": "chart",
            "title": "Market Share - Mobile Banking Brasil 2024",
            "chart_type": "pie",
            "chart_data": {
                "categories": ["Itaú", "Nubank", "Bradesco", "BB", "Santander", "Outros"],
                "series": [
                    {"name": "Market Share", "values": [22, 28, 15, 14, 10, 11]},
                ],
            },
        },
        {
            "layout": "closing",
            "title": "Obrigado",
            "subtitle": "Documento confidencial - Uso interno",
        },
    ],
}


def main():
    gen = IBPresentationGenerator()
    pptx_bytes = gen.generate(SAMPLE_DATA)

    output_path = os.path.join(
        os.path.dirname(__file__), "..", "output_teste.pptx"
    )
    with open(output_path, "wb") as f:
        f.write(pptx_bytes)

    size_kb = len(pptx_bytes) / 1024
    print(f"Apresentação gerada com sucesso!")
    print(f"  Arquivo: {os.path.abspath(output_path)}")
    print(f"  Tamanho: {size_kb:.1f} KB")
    print(f"  Slides:  {len(SAMPLE_DATA['slides'])}")
    print(f"  Layouts: {[s['layout'] for s in SAMPLE_DATA['slides']]}")


if __name__ == "__main__":
    main()
