# Padrão do assistente nos apps SaibaTudo (caixa de pergunta e resposta)

Todo app SaibaTudo (site/PWA e Android) tem uma caixa de pergunta em linguagem natural respondida por dados. Este documento
fixa o que ela precisa ter, para que um app novo nasça com a mesma experiência e os antigos não regridam. A implementação
de referência é a do site de Eleições (`apps/eleicoes2026/web/src/eleicoes2026/`); a de Química (`apps/quimica/web/src/quimica/`)
segue o mesmo padrão desde 12/10/2026. Quando um app ganhar uma melhoria desta lista, porte para os outros e atualize aqui.

## 1. Campo de pergunta (obrigatório)
| Item | Comportamento | Referência |
| :-- | :-- | :-- |
| Campo que cresce | `<textarea>` de 1 até 3 linhas; depois rola. Enter envia; quebras de linha coladas viram espaço. Reajusta ao redimensionar a janela ou mudar o tamanho do texto. | `campoAutoAltura`/`ajustarAltura` em `apps/eleicoes2026/web/src/eleicoes2026/js/ui/components.js` e `apps/quimica/web/src/quimica/js/ui/componentes.js` |
| Campo limpo ao enviar | O texto sai do campo assim que a pergunta é enviada; a pergunta fica no histórico. | `perguntar()` nos dois `app.js`/`inicio.js` |
| Histórico de perguntas | Guardado só no aparelho (prefs/localStorage, máx. 50 itens de até 300 caracteres, sem repetir a última). Cartão "Última pergunta" acima do campo com setas ▲▼ e as teclas ↑/↓ no campo (↑ só com o cursor no início, ↓ só no fim; ↓ depois da última volta ao rascunho). "Limpar histórico" nas configurações. | `prefs.historicoPerguntas`, `subirHistorico/descerHistorico`; Android: `HistoricoPerguntas.kt` (eleições) |
| Estados do envio | Botão X para limpar (só com texto), enviar desabilitado sem texto e durante o processamento, spinner enquanto analisa, chips de sugestão desabilitados enquanto processa, proteção contra envio duplo. | `atualizarBotoesBusca` (eleições), `atualizarEstado` (química) |
| Sugestões | Chips de exemplo ao abrir e "Você também pode perguntar" em cada resposta (até 6). Em Eleições os chips da home mudam a cada resposta — padrão a seguir. | `SUGESTOES_PADRAO`, `suggestedQuestions`/`sugestoes` |
| Deep link | `?q=pergunta` executa ao abrir (Química tem; Eleições tem pergunta inicial configurável). | `inicio.js` (química), `prefs.perguntaInicial` (eleições) |

## 2. Contexto da conversa (obrigatório)
- A pergunta seguinte herda o que faltar da anterior: entidade ("e o do potássio?"), atributo ("e o ponto de ebulição?"), lugar
  ("e em SP?"). Resolvido **no aparelho**, antes de qualquer envio à nuvem; a nuvem recebe a pergunta já completada
  (`_comContexto` em eleições) e um resumo da resposta anterior, nunca o histórico inteiro.
- O contexto é limpo ao fechar a resposta, trocar de tela ou fazer uma pergunta sem relação. Uma pergunta de esclarecimento
  ("de qual estado?") nunca vira contexto da nuvem; se a intenção já está clara, resolva a ambiguidade localmente (lição do
  "deputado mais votado", 12/10/2026).
- Referência: `resolverContinuacao` em `apps/eleicoes2026/web/src/eleicoes2026/js/nlu.js` e `parse(…, contexto)` em
  `apps/quimica/web/src/quimica/js/nlu.js`.

## 3. Resposta (obrigatório)
| Item | Comportamento |
| :-- | :-- |
| Origem visível | Rótulo com a origem (montada no aparelho / IA na nuvem / dados oficiais) e a **data dos dados** (extração do TSE, `generatedAt` do pacote). |
| Fonte em cada resposta | Fonte e licença de cada número; em Química, por bloco e em "Fontes e licenças". |
| Texto gerado rotulado | Tudo o que vem de modelo diz "Texto gerado por IA — pode conter erros" e nunca contradiz os dados do app (o servidor descarta). |
| Copiar resposta | Botão "Copiar resposta": texto plano com fonte, origem e o endereço do app. |
| Fechar resposta | Botão X na resposta; limpa o contexto da conversa. |
| Relatar problema | "Relatar problema nesta resposta": diálogo com prévia do que será enviado (eleições, `/api/report`) ou, no mínimo, link para abrir uma issue pública já com a pergunta no título (química). Nada é enviado sem a pessoa clicar. |
| Não entendi | Ecoa a pergunta, dá exemplos e chips; oferece a nuvem (quando houver) e, com consentimento, a captura "Ajudar a melhorar o app" com filtro de dado pessoal (e de opinião política em eleições). |
| IA na nuvem | Botão sempre disponível depois de uma resposta (conferir ou gerar explicação), opt-in, com o texto de consentimento padrão; indisponível = aviso claro, nunca botão quebrado. |

## 4. Acessibilidade e privacidade (obrigatório)
- Região da resposta com `aria-live`; `anunciar()` ao começar a analisar e ao responder; foco no título da resposta (Química faz;
  Eleições deve adotar); `role=status` no spinner; `label` do campo (`sr-only`) e `aria-label` nos botões de ícone;
  `prefers-reduced-motion` respeitado.
- Nada sai do aparelho sem toque ou consentimento; histórico e preferências ficam só no navegador/aparelho, com "Apagar os
  dados deste aparelho" nas configurações.

## 5. Preferências (obrigatório)
Tema (sistema/claro/escuro), tamanho do texto, instalar como app (botão na barra e em configurações, com instruções para
iOS), economia de dados, e uma preferência que muda o motor quando fizer sentido (Eleições: "Meu estado"; Química: nível
fundamental/médio/superior — o Android já tem, a web deve adotar).

## 6. Paridade site × Android
Toda melhoria desta lista existe nos dois clientes do mesmo app, com casos no contrato compartilhado (`contracts/`) quando
houver regra de interpretação. Checklist por app em `apps/<app>/docs/PENDENCIAS.md`.

## 7. Estado em 12/10/2026
- Eleições web: tudo do §1–§5, exceto copiar (feito em 12/10) e foco no título da resposta.
- Química web: §1 completo (12/10), §3 completo no mínimo (origem+data, copiar, fechar, relatar por issue), contexto parcial
  (entidade e atributo), sem nuvem/captura (backend pronto, desligado), sem nível na web, instalar só nas configurações.
- Android: Eleições completo; Química com histórico (sem ▲▼), sem limpar ao enviar, sem relatar, com copiar e nível.
