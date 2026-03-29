"""
Script para configurar o Service Account automaticamente
"""

import shutil
import os

source_file = 'futsal-476923-19e955d7ed78.json'
target_file = 'credentials.json'

print("="*60)
print("Configurando Service Account")
print("="*60)

if os.path.exists(source_file):
    try:
        shutil.copy(source_file, target_file)
        print(f"\n✅ Arquivo copiado com sucesso!")
        print(f"   {source_file} -> {target_file}")
        print("\n📋 PRÓXIMO PASSO:")
        print("   Compartilhe a planilha com:")
        print("   futilouco@futsal-476923.iam.gserviceaccount.com")
        print("   (com permissão de Editor)")
        print("\n   Depois execute: python app.py (nesta pasta)")
    except Exception as e:
        print(f"\n❌ Erro ao copiar arquivo: {e}")
else:
    print(f"\n❌ Arquivo não encontrado: {source_file}")
    print("\nCertifique-se de que o arquivo está na pasta do projeto.")
