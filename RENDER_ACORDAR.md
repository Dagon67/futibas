# Manter o backend acordado no Render (evitar sleep)

No plano **gratuito** do Render, o serviço dorme após ~15 minutos sem acesso. O primeiro request depois disso pode demorar 30–60 s ou retornar 502.

## O que já está no app

- **Ao abrir o app** (index ou totem), o frontend já faz um request em background para `/health` do backend. Assim o Render começa a acordar assim que alguém abre a página; quando a pessoa clicar em “Sincronizar”, o backend pode já estar de pé.

## Manter acordado 24/7 (gratuito): UptimeRobot

Com o **UptimeRobot** você pode fazer um ping no backend a cada 5 minutos. Enquanto houver esse ping, o Render não coloca o serviço para dormir.

### Passo a passo

1. Acesse **[uptimerobot.com](https://uptimerobot.com)** e crie uma conta (grátis).
2. Clique em **Add New Monitor**.
3. Preencha:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** ex. `Backend Futibas`
   - **URL:** a URL do seu backend, ex. `https://futibas.onrender.com/health`
   - **Monitoring Interval:** 5 minutes (no plano grátis)
4. Clique em **Create Monitor**.

Pronto. O UptimeRobot vai acessar o backend a cada 5 minutos e o Render tende a mantê-lo acordado.

### Observação

- O plano gratuito do UptimeRobot permite 50 monitores e intervalo de 5 minutos; para um único backend é suficiente.
- Se mesmo assim o serviço dormir (ex.: Render mudar a política), o app continua “acordando” o backend ao abrir a página; o primeiro sync pode levar até ~1 minuto.

## Outras opções

- **Plano pago no Render** (a partir de ~US$ 7/mês): serviço sempre ligado, sem sleep.
- **Outro host**: alguns provedores gratuitos não colocam o app para dormir (pesquise “free tier no spin down”).
