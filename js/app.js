/* ===========================
   🚀 INICIALIZAÇÃO DA APLICAÇÃO
   =========================== */

// Inicializar
goHome(); // tela inicial
// Em produção, acordar o backend (Render) em background para reduzir 502 no primeiro sync
if (typeof wakeBackendIfNeeded === "function") wakeBackendIfNeeded();

// Limpar intervalo ao sair da página
window.addEventListener('beforeunload', function(){
    if(window.dateTimeInterval) clearInterval(window.dateTimeInterval);
});
