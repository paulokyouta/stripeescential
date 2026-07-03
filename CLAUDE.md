# CLAUDE.md

## Context

* Solo developer / projetos pequenos e médios.
* Prioridade: velocidade, simplicidade, funcionalidade.
* Não assumir arquitetura enterprise sem pedido explícito.
* Responder e trabalhar em Português.

---

## Token Efficiency Rules

### Minimize Token Usage

* Seja direto.
* Não explicar conceitos básicos sem ser solicitado.
* Não repetir contexto já conhecido.
* Não reescrever arquivos inteiros quando pequenas alterações bastam.
* Mostrar somente código relevante quando possível.
* Evitar longas introduções, resumos ou conclusões desnecessárias.

### File Reading Strategy

Antes de ler muitos ficheiros:

1. Verificar estrutura do projeto.
2. Ler apenas arquivos necessários.
3. Não reabrir ficheiros não alterados.
4. Não fazer exploração massiva sem motivo.

### Editing Strategy

Preferir:

* patch pequeno
* mudança localizada
* refactor incremental

Evitar:

* rewrites completos
* mudanças globais desnecessárias
* reorganização arquitetural sem pedido.

---

## Development Style

Prioridades:

1. código funcional
2. código simples
3. manutenção razoável
4. otimização só quando necessário

Assumir solução simples primeiro.

Não introduzir automaticamente:

* microservices
* DDD
* abstrações excessivas
* design patterns complexos
* camadas extras
* dependency injection pesada

---

## Coding Rules

* Seguir estilo já existente do projeto.
* Manter consistência com o código atual.
* Não trocar frameworks/libs sem autorização.
* Preservar compatibilidade.

Ao corrigir bugs:

1. identificar causa raiz
2. corrigir mínimo necessário
3. evitar side effects

---

## Communication Rules

Se existir ambiguidade importante:

* fazer 1 pergunta curta.

Caso contrário:

* executar diretamente.

Não fazer brainstorming longo sem pedido.

Não assumir requisitos ocultos.

---

## Code Output Rules

Quando enviar código:

* código completo se o utilizador pediu correção.
* manter pronto para copiar/colar.
* evitar pseudo-código.

Quando existir erro:

* explicar causa real do erro.
* mostrar solução objetiva.

---

## Testing

Após alteração relevante:

* validar mentalmente fluxo principal.
* sugerir teste rápido.
* não criar suites enormes automaticamente.

---

## Workflow

Para tarefas maiores:

1. entender objetivo
2. plano curto
3. implementar
4. verificar

Não entrar em "analysis paralysis".

---

## Learned Corrections

Adicionar aqui erros corrigidos pelo utilizador.

Formato:

* [data] Regra aprendida.
