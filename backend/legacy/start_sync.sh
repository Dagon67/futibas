#!/bin/bash
echo "========================================"
echo "Iniciando serviço de sincronização"
echo "========================================"
echo ""
cd "$(dirname "$0")"
python app.py
