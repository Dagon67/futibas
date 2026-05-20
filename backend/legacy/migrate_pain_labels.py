#!/usr/bin/env python3
"""
Migração única: transcreve códigos de pontos de dor na aba 'pre' do Google Sheets.

Uso (na pasta backend/legacy, com credenciais Google configuradas):
  python migrate_pain_labels.py           # simulação (dry-run)
  python migrate_pain_labels.py --apply   # grava na planilha
"""
import argparse
import sys

from sheets_sync import sync_data


def main() -> int:
    parser = argparse.ArgumentParser(description="Transcreve códigos de dor → nomes na aba pre")
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Aplica na planilha (sem isto, só simula)",
    )
    args = parser.parse_args()
    dry_run = not args.apply

    print("Modo:", "SIMULAÇÃO (dry-run)" if dry_run else "APLICAR na planilha")
    result = sync_data("migrate_pre_pain_labels", {"dry_run": dry_run})
    if not result.get("success"):
        print("Erro:", result.get("error", result))
        return 1

    print(result.get("message", "OK"))
    print("Linhas de dados:", result.get("total_data_rows"))
    print("Células alteradas:", result.get("cells_changed"))
    if result.get("changes"):
        print("Exemplos (até 10):")
        for ch in result["changes"][:10]:
            print(f"  linha {ch['row']} | {ch['column']}: {ch['before']!r} → {ch['after']!r}")
    if result.get("changes_truncated"):
        print("(lista truncada a 200 alterações no JSON de resposta)")

    if dry_run and result.get("cells_changed", 0) > 0:
        print("\nPara aplicar: python migrate_pain_labels.py --apply")
    return 0


if __name__ == "__main__":
    sys.exit(main())
