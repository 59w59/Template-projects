# Limitador de Requisições (Rate Limiting)

Implementamos um limitador de tráfego de requisições adaptativo para proteger a API e rotas críticas contra ataques de força bruta, script scraping e negação de serviço (DoS).

## Algoritmo Sliding Window (Janela Deslizante)

Em vez do algoritmo simples Fixed Window (que reseta o contador em blocos fixos de tempo e pode ser burlado enviando o dobro de requisições no limite da janela), este template utiliza **Sliding Window**:
- Ele registra o carimbo de data/hora (timestamp) exato de cada requisição individual.
- A cada chamada, ele limpa registros fora do escopo do tempo limite (`windowMs`).
- Ele valida se o volume de carimbos ativos está dentro do limite.
- A memória in-memory é limpa automaticamente a cada 5 minutos por uma rotina dedicada de garbage collector no Node.js para prevenir vazamentos de memória (Memory Leaks).

## Chaveamento Automático para Upstash Redis

Para deploys em nuvem (Vercel, Netlify) que utilizam Serverless e Edge, a memória em processo é apagada a cada execução. Para manter o Rate Limit funcionando de forma distribuída:
1. Configure as chaves `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` no `.env`.
2. A biblioteca (`rate-limiter.ts`) detecta as variáveis e ativa o driver Redis.
3. Ele usa estrutura de dados ZSET do Redis para manter a janela deslizante de forma distribuída e ultrarrápida.
4. **Resiliência / Failover:** Se o Redis cair ou falhar por latência, ele captura o erro e faz um fallback silencioso imediato para a janela in-memory, evitando que os usuários fiquem bloqueados por problemas na nuvem.
