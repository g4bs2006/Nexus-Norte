# Design system — previews

Cards visuais do design system do Nexus, publicados no
[claude.ai/design](https://claude.ai/design) (projeto **Nexus**).

## Como funciona

`gerar.py` produz os previews em `out/`. Cada arquivo é um HTML autocontido com
um marcador `@dsCard` na primeira linha, que é o que o painel do Claude Design lê
para montar o índice.

```bash
cd design-system
python gerar.py     # escreve out/foundations/*.html e out/components/*.html
```

`out/` não é versionado — é derivado.

## Por que um gerador, e não arquivos escritos à mão

Os tokens de cor, tipografia e movimento precisam ser **idênticos** em todos os
12 cards. Duplicar ~60 linhas de CSS em 12 arquivos garante que eles divirjam na
primeira edição. O gerador mantém uma cópia só.

## O que precisa de atenção ao editar

Os tokens em `gerar.py` são uma **cópia** de `app/src/index.css`. Não há
verificação automática de que estejam em sincronia — ao mudar a paleta no app,
atualize aqui também. Uma alternativa seria extrair os tokens para um JSON lido
pelos dois lados; não foi feito porque o Tailwind v4 declara os tokens em CSS, e
converter isso em build step custaria mais do que o problema que resolve hoje.

## Cards

| Grupo | Card |
| --- | --- |
| Fundamentos | Cores, Tipografia, Movimento |
| Componentes | Check do dia, Progresso, Cards de pilar, Cabeçalho de pilar, Estado vazio, Skeletons, Formulários, Grade de fluxograma |
| Navegação | Sidebar e barra inferior |
