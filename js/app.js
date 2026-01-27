/* ===========================
   🚀 INICIALIZAÇÃO DA APLICAÇÃO
   =========================== */

// Inicializar
goHome(); // tela inicial

// Limpar intervalo ao sair da página
window.addEventListener('beforeunload', function(){
    if(window.dateTimeInterval) clearInterval(window.dateTimeInterval);
});
