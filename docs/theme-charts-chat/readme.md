# Tema Visual, Gráficos e Chats Interativos

A experiência visual do template foi desenhada com design de alta fidelidade (estilo dark-mode premium com cores selecionadas e glassmorphism).

## Configuração de Cores e Estilo

- **Paleta de Cores:** Focada em tons de slate profundo (`bg-slate-950`) combinados com acentos esmeralda (`text-emerald-500`) e tons suaves de cinza, garantindo contraste sofisticado e legibilidade premium.
- **Glassmorphism:** Usamos combinações de opacidade de fundo com filtros de desfoque nativos (`backdrop-blur-md bg-card/30`) e bordas translúcidas, dando um aspecto moderno e futurista.

## Gráfico de Tráfego SVG (`SecurityChart`)

Para evitar problemas de compatibilidade do React 19 (que comumente trava bibliotecas de gráficos antigas como Recharts em modo SSR):
- Desenvolvemos um gráfico de área com linhas de grade responsivas em **SVG puro**.
- Ele utiliza gradientes lineares (`linearGradient`) para o preenchimento, e círculos de dados flutuantes com animação de escala de zoom suave ao passar o cursor (`transition-transform hover:scale-150`).
- Apresenta dados fictícios de tráfego (requisições válidas vs ataques bloqueados).

## Chat de Suporte IA (`AuditChat`)

No canto lateral do Dashboard, incluímos uma interface de chat interativa e animada:
- Simula um canal de auditoria de segurança ativo com luz verde pulsante (`animate-pulse`).
- Permite que o desenvolvedor envie mensagens comuns e obtenha respostas automáticas sobre arquitetura do template.
- Responde a palavras-chave como "logs", "segurança", "criptografia", "drizzle", demonstrando a capacidade de construir telas ricas e fluidas.
