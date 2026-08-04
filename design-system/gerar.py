"""
Gera os previews do design system do Nexus para o claude.ai/design.

Um script em vez de arquivos escritos à mão: os tokens são os mesmos do
app/src/index.css e precisam estar idênticos em todos os cards. Duplicar 60
linhas de CSS em 11 arquivos garante divergência na primeira edição.
"""

from pathlib import Path

SAIDA = Path("design-system")

# Tokens copiados de app/src/index.css — fonte única aqui dentro
TOKENS = """
  :root {
    --ground:#ffffff; --surface:#fbfbfa; --card:#ffffff;
    --ink:#37352f; --ink-soft:#787774; --rule:#e9e9e7; --rule-strong:#d8d8d5;
    --muted:#f7f7f5;
    --financeiro:#4f9d69; --financeiro-soft:#edf6f0;
    --estudos:#4a87c4;    --estudos-soft:#edf3f9;
    --treino:#d0764b;     --treino-soft:#fbf1ec;
    --projetos:#8b6bb5;   --projetos-soft:#f4f0f9;
    --sono:#b8941f;       --sono-soft:#faf6e8;
    --ok:#2f8b6d; --atencao:#b8941f; --risco:#c4554d;
    --radius:8px;
    --sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
    --mono:ui-monospace,"SF Mono",SFMono-Regular,"Cascadia Mono",Menlo,Consolas,monospace;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --ground:#191919; --surface:#1d1d1d; --card:#202020;
      --ink:#d4d4d4; --ink-soft:#9b9b9b; --rule:#3f3f3f; --rule-strong:#4d4d4d;
      --muted:#262626;
      --financeiro:#7fbf95; --financeiro-soft:#1f2a23;
      --estudos:#7faedc;    --estudos-soft:#1e2630;
      --treino:#e09670;     --treino-soft:#302620;
      --projetos:#b096d6;   --projetos-soft:#29232f;
      --sono:#d9bc5c;       --sono-soft:#2d2a1e;
      --ok:#6cc0a5; --atencao:#d9bc5c; --risco:#d97970;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin:0; padding:24px; background:var(--ground); color:var(--ink);
    font-family:var(--sans); line-height:1.6; -webkit-font-smoothing:antialiased;
  }
  .stack { display:flex; flex-direction:column; gap:20px; }
  .row { display:flex; flex-wrap:wrap; gap:12px; align-items:center; }
  .rotulo {
    font-family:var(--mono); font-size:10px; letter-spacing:.1em;
    text-transform:uppercase; color:var(--ink-soft);
  }
  .card {
    background:var(--card); border:1px solid var(--rule);
    border-radius:var(--radius); padding:14px 16px;
    display:flex; flex-direction:column; gap:8px;
  }
  .nota { font-size:12px; color:var(--ink-soft); margin:0; }
  .metric-lg { font-family:var(--mono); font-variant-numeric:tabular-nums; font-size:30px; line-height:1; letter-spacing:-.03em; }
  .metric-md { font-family:var(--mono); font-variant-numeric:tabular-nums; font-size:20px; line-height:1.1; letter-spacing:-.02em; }
  .metric-sm { font-family:var(--mono); font-variant-numeric:tabular-nums; font-size:14px; line-height:1.2; }
  .barra { height:4px; background:var(--muted); border-radius:999px; overflow:hidden; }
  .barra > i { display:block; height:100%; border-radius:999px; }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration:.01ms !important; transition-duration:.01ms !important; }
  }
"""


def pagina(grupo: str, nome: str, subtitulo: str, corpo: str, css_extra: str = "") -> str:
    return f"""<!-- @dsCard group="{grupo}" name="{nome}" subtitle="{subtitulo}" -->
<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{nome} — Nexus</title>
<style>{TOKENS}{css_extra}</style>
</head>
<body>
<div class="stack">
{corpo}
</div>
</body>
</html>
"""


def swatch(nome: str, var: str, hexes: str) -> str:
    return f"""      <div style="display:flex;flex-direction:column;gap:6px;min-width:112px">
        <div style="height:48px;border-radius:6px;background:var({var});border:1px solid color-mix(in oklab,var(--ink) 12%,transparent)"></div>
        <div><div style="font-size:12px">{nome}</div><div class="rotulo">{hexes}</div></div>
      </div>"""


ARQUIVOS: dict[str, str] = {}

# ---------------------------------------------------------------- fundamentos
ARQUIVOS["foundations/cores.html"] = pagina(
    "Fundamentos", "Cores", "Paleta Notion, 5 pilares, 3 estados",
    f"""  <div>
    <p class="rotulo">Base — paleta estilo Notion</p>
    <div class="row" style="margin-top:8px">
{swatch("Fundo", "--ground", "#FFFFFF / #191919")}
{swatch("Superfície", "--surface", "#FBFBFA / #1D1D1D")}
{swatch("Texto", "--ink", "#37352F / #D4D4D4")}
{swatch("Borda", "--rule", "#E9E9E7 / #3F3F3F")}
    </div>
  </div>

  <div>
    <p class="rotulo">Pilares — pastel dessaturado</p>
    <div class="row" style="margin-top:8px">
{swatch("Financeiro", "--financeiro", "#4F9D69")}
{swatch("Estudos", "--estudos", "#4A87C4")}
{swatch("Treino", "--treino", "#D0764B")}
{swatch("Projetos", "--projetos", "#8B6BB5")}
{swatch("Sono", "--sono", "#B8941F")}
    </div>
  </div>

  <div>
    <p class="rotulo">Estados — separados das cores de pilar</p>
    <div class="row" style="margin-top:8px">
{swatch("Ok", "--ok", "#2F8B6D")}
{swatch("Atenção", "--atencao", "#B8941F")}
{swatch("Risco", "--risco", "#C4554D")}
    </div>
    <p class="nota" style="margin-top:10px">
      O verde de "ok" puxa para o ciano de propósito: era o mesmo hex do
      Financeiro, e saldo positivo competia com a identidade do pilar.
      Cor semântica marca só o que pede atenção — valor positivo usa a cor de
      texto.
    </p>
  </div>""",
)

ARQUIVOS["foundations/tipografia.html"] = pagina(
    "Fundamentos", "Tipografia", "Inter para texto, mono para dígitos",
    """  <div class="card">
    <p class="rotulo">Inter — interface e texto</p>
    <div style="font-size:26px;letter-spacing:-.02em;font-weight:500">Planejado vs. realizado</div>
    <div style="font-size:15px">Corpo com line-height generoso, títulos em peso médio.</div>
    <div style="font-size:12px;color:var(--ink-soft)">Texto secundário</div>
  </div>

  <div class="card">
    <p class="rotulo">Escala de métrica — só dígitos</p>
    <div class="row" style="gap:32px;align-items:baseline">
      <div><div class="rotulo">metric-lg</div><div class="metric-lg">7h45</div></div>
      <div><div class="rotulo">metric-md</div><div class="metric-md">R$ 3.000</div></div>
      <div><div class="rotulo">metric-sm</div><div class="metric-sm">101,3</div></div>
    </div>
    <p class="nota">
      O Nexus é um painel de leituras. Face própria para o número faz dele um
      mostrador, não uma palavra. Figuras tabulares em todos os três.
    </p>
  </div>""",
)

ARQUIVOS["foundations/movimento.html"] = pagina(
    "Fundamentos", "Movimento", "4 movimentos; o resto fica fora",
    """  <div class="card">
    <p class="rotulo">Entrada escalonada — 40ms entre itens</p>
    <div class="grade">
      <div>Financeiro</div><div>Estudos</div><div>Treino</div><div>Projetos</div>
    </div>
  </div>

  <div class="card">
    <p class="rotulo">Skeleton — forma casada ao conteúdo</p>
    <div style="display:flex;flex-direction:column;gap:8px">
      <div class="sk" style="height:10px;width:35%"></div>
      <div class="sk" style="height:24px;width:55%"></div>
      <div class="sk" style="height:10px;width:45%"></div>
    </div>
  </div>

  <div class="card">
    <p class="rotulo">Fora, de propósito</p>
    <p class="nota">
      Sem transição entre rotas (briga com o Suspense do code-splitting), sem
      parallax, sem hover elaborado em card, sem confete ao concluir — em uso
      diário, celebração vira interrupção na terceira vez.
      <code style="font-family:var(--mono);font-size:11px">prefers-reduced-motion</code>
      neutraliza tudo.
    </p>
  </div>""",
    css_extra="""
  @keyframes surgir { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
  .grade { display:grid; grid-template-columns:repeat(4,1fr); gap:8px }
  .grade > div {
    border:1px solid var(--rule); border-radius:6px; padding:10px;
    font-family:var(--mono); font-size:12px; background:var(--surface);
    animation:surgir 420ms cubic-bezier(.16,1,.3,1) both;
  }
  .grade > div:nth-child(2){animation-delay:40ms}
  .grade > div:nth-child(3){animation-delay:80ms}
  .grade > div:nth-child(4){animation-delay:120ms}
  @keyframes shimmer { to { background-position:-200% 0 } }
  .sk {
    border-radius:4px;
    background:linear-gradient(90deg,var(--rule) 25%,color-mix(in oklab,var(--rule) 45%,var(--ground)) 50%,var(--rule) 75%);
    background-size:200% 100%; animation:shimmer 1.4s linear infinite;
  }
""",
)

# ---------------------------------------------------------------- componentes
MARCA_SVG = (
    '<svg viewBox="0 0 24 24" class="marca"><path d="M4 12.5 9.5 18 20 6.5"/></svg>'
)

ARQUIVOS["components/check-dia.html"] = pagina(
    "Componentes", "Check do dia", "A assinatura — marcado, pendente, remarcado",
    f"""  <div class="card">
    <p class="rotulo">O dia — bloco de destaque da Home</p>
    <div style="display:flex;align-items:baseline;justify-content:space-between">
      <div style="font-size:15px;font-weight:500">O dia</div>
      <div class="metric-md">2/4</div>
    </div>
    <div class="barra"><i style="width:50%;background:color-mix(in oklab,var(--ink) 60%,transparent)"></i></div>

    <div style="display:flex;flex-direction:column;gap:2px;margin-top:6px">
      <label class="check marcado">
        <span class="caixa">{MARCA_SVG}</span>
        <span class="txt"><span class="risco">Lancei os gastos de hoje</span></span>
      </label>
      <label class="check marcado">
        <span class="caixa">{MARCA_SVG}</span>
        <span class="txt"><span class="risco">Cálculo II</span> <span class="hora">08:00</span></span>
      </label>
      <label class="check">
        <span class="caixa">{MARCA_SVG}</span>
        <span class="txt"><span class="risco">Física I</span> <span class="hora">10:00</span>
          <span style="color:var(--atencao);font-size:12px;margin-left:6px">remarcado</span></span>
      </label>
      <label class="check">
        <span class="caixa">{MARCA_SVG}</span>
        <span class="txt"><span class="risco">Treino A — Peito</span> <span class="hora">19:00</span></span>
      </label>
    </div>

    <p class="nota" style="margin-top:6px">
      Caixa com overshoot em 180ms, marca desenhada com 60ms de espera, risco
      varrendo o texto em 260ms. Área de toque cobre a linha inteira.
      Sem confete: a satisfação vem da precisão, não do volume.
    </p>
  </div>""",
    css_extra="""
  .check {
    display:flex; align-items:center; gap:12px; padding:8px; margin:0 -8px;
    border-radius:6px; cursor:pointer; font-size:14px;
  }
  .check:hover { background:color-mix(in oklab,var(--muted) 60%,transparent) }
  .caixa {
    display:grid; place-items:center; flex:none; width:18px; height:18px;
    border-radius:5px; border:1.5px solid var(--rule-strong); background:var(--card);
    transition:background 180ms ease,border-color 180ms ease,transform 180ms cubic-bezier(.34,1.56,.64,1);
  }
  .marca {
    width:11px; height:11px; fill:none; stroke:var(--card); stroke-width:3.2;
    stroke-linecap:round; stroke-linejoin:round;
    stroke-dasharray:24; stroke-dashoffset:24;
    transition:stroke-dashoffset 180ms ease 60ms;
  }
  .risco { position:relative }
  .risco::after {
    content:""; position:absolute; left:0; top:54%; height:1px; width:100%;
    background:currentColor; transform:scaleX(0); transform-origin:left;
    transition:transform 260ms cubic-bezier(.4,0,.2,1);
  }
  .hora { font-family:var(--mono); font-size:12px; color:var(--ink-soft) }
  .marcado .caixa { background:var(--ok); border-color:var(--ok); transform:scale(1.08) }
  .marcado .marca { stroke-dashoffset:0 }
  .marcado .txt { color:var(--ink-soft) }
  .marcado .risco::after { transform:scaleX(1) }
""",
)


def anel(pct: int, cor: str, rotulo: str) -> str:
    circ = 201
    off = circ * (1 - min(pct, 100) / 100)
    return f"""      <div style="display:flex;flex-direction:column;align-items:center;gap:6px">
        <div style="position:relative;width:72px;height:72px">
          <svg width="72" height="72" viewBox="0 0 72 72" style="transform:rotate(-90deg)">
            <circle cx="36" cy="36" r="32" fill="none" stroke="var(--rule)" stroke-width="5"/>
            <circle cx="36" cy="36" r="32" fill="none" stroke="{cor}" stroke-width="5"
              stroke-linecap="round" stroke-dasharray="{circ}" stroke-dashoffset="{off:.0f}"/>
          </svg>
          <span style="position:absolute;inset:0;display:grid;place-items:center;font-family:var(--mono);font-size:12px">{pct}%</span>
        </div>
        <span class="rotulo">{rotulo}</span>
      </div>"""


ARQUIVOS["components/progresso.html"] = pagina(
    "Componentes", "Progresso", "Anel e barra, animando de zero",
    f"""  <div class="card">
    <p class="rotulo">Anel — cor do pilar, ou risco quando estoura</p>
    <div class="row" style="gap:28px">
{anel(38, "var(--financeiro)", "dentro da meta")}
{anel(86, "var(--atencao)", "perto do limite")}
{anel(118, "var(--risco)", "estourou")}
    </div>
  </div>

  <div class="card">
    <p class="rotulo">Barra — uma por pilar</p>
    <div style="display:flex;flex-direction:column;gap:12px;margin-top:4px">
      <div><div class="rotulo">Financeiro</div><div class="barra"><i style="width:62%;background:var(--financeiro)"></i></div></div>
      <div><div class="rotulo">Estudos</div><div class="barra"><i style="width:45%;background:var(--estudos)"></i></div></div>
      <div><div class="rotulo">Treino</div><div class="barra"><i style="width:75%;background:var(--treino)"></i></div></div>
      <div><div class="rotulo">Projetos</div><div class="barra"><i style="width:62%;background:var(--projetos)"></i></div></div>
      <div><div class="rotulo">Sono</div><div class="barra"><i style="width:91%;background:var(--sono)"></i></div></div>
    </div>
    <p class="nota">
      Ambos montam em 0 e animam até o valor: sem isso a transição declarada
      nunca dispara, porque o valor chega pronto. A barra tem role e
      aria-valuenow.
    </p>
  </div>""",
)

ARQUIVOS["components/cards-pilar.html"] = pagina(
    "Componentes", "Cards de pilar", "Tile de status, categoria, matéria, projeto",
    """  <div>
    <p class="rotulo">Faixa de status da Home — listra de severidade</p>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:8px">
      <a class="tile" style="--listra:transparent">
        <span class="listra"></span>
        <span class="rotulo">Financeiro</span>
        <span class="metric-md">R$ 3.000</span>
        <span class="nota">projeção R$ 4.070</span>
      </a>
      <a class="tile" style="--listra:var(--risco)">
        <span class="listra"></span>
        <span class="rotulo">Estudos</span>
        <span class="metric-md">1 em risco</span>
        <span class="nota">P3 em 6 dias</span>
      </a>
      <a class="tile" style="--listra:var(--atencao)">
        <span class="listra"></span>
        <span class="rotulo">Treino</span>
        <span class="metric-md">2/4</span>
        <span class="nota">PR 102,0kg · Supino</span>
      </a>
      <a class="tile" style="--listra:var(--atencao)">
        <span class="listra"></span>
        <span class="rotulo">Projetos</span>
        <span class="metric-md">2 paradinhos</span>
        <span class="nota">ativo: Nexus</span>
      </a>
    </div>
    <p class="nota" style="margin-top:10px">
      Só atenção e risco desenham a listra. Se tudo ganhasse marca, a marca
      deixaria de chamar atenção.
    </p>
  </div>

  <div>
    <p class="rotulo">Card de categoria e de matéria</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-top:8px">
      <div class="card" style="flex-direction:row;align-items:center;gap:16px">
        <div style="position:relative;width:56px;height:56px;flex:none">
          <svg width="56" height="56" viewBox="0 0 56 56" style="transform:rotate(-90deg)">
            <circle cx="28" cy="28" r="25.5" fill="none" stroke="var(--rule)" stroke-width="5"/>
            <circle cx="28" cy="28" r="25.5" fill="none" stroke="var(--treino)" stroke-width="5"
              stroke-linecap="round" stroke-dasharray="160" stroke-dashoffset="100"/>
          </svg>
          <span style="position:absolute;inset:0;display:grid;place-items:center;font-size:11px;font-family:var(--mono)">38%</span>
        </div>
        <div style="min-width:0">
          <div style="font-size:14px;font-weight:500">Delivery</div>
          <div class="nota">R$ 113,00 de R$ 300,00</div>
          <div class="nota" style="text-transform:capitalize">variavel</div>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;gap:8px">
          <div style="min-width:0">
            <div style="font-size:14px;font-weight:500">Física I</div>
            <div class="nota">Profa. Lima</div>
          </div>
          <span class="selo" style="color:var(--risco)">
            <span class="ponto" style="background:var(--risco)"></span>Risco
          </span>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:4px">
          <div><div class="rotulo">Média</div><div class="metric-md">4,8</div></div>
          <div><div class="rotulo">Faltas restantes</div><div class="metric-md" style="color:var(--risco)">2<span style="font-size:12px;color:var(--ink-soft)"> / 15</span></div></div>
        </div>
        <div class="nota">P3 em 6 dias</div>
      </div>

      <div class="card" style="opacity:.6">
        <div style="display:flex;justify-content:space-between;gap:8px">
          <div style="min-width:0">
            <div style="font-size:14px;font-weight:500">Reforma do quarto</div>
            <div class="nota">Marcenaria, pintura e iluminação.</div>
          </div>
          <span class="selo">Pausado</span>
        </div>
        <div><div class="rotulo">Marcos concluídos</div><div class="barra" style="margin-top:4px"><i style="width:50%;background:var(--projetos)"></i></div></div>
        <div class="nota" style="color:var(--atencao)">Última atualização há 47 dias</div>
      </div>
    </div>
    <p class="nota" style="margin-top:10px">
      Projeto com momentum baixo perde opacidade — esfria sem esconder a
      informação. Concluído não esfria: não se espera mais movimento nele.
    </p>
  </div>""",
    css_extra="""
  .tile {
    position:relative; overflow:hidden; display:flex; flex-direction:column; gap:6px;
    background:var(--card); border:1px solid var(--rule); border-radius:var(--radius);
    padding:12px; text-decoration:none; color:inherit;
  }
  .listra { position:absolute; inset:0 auto 0 0; width:3px; background:var(--listra) }
  .selo {
    display:inline-flex; align-items:center; gap:6px; flex:none;
    font-size:11px; padding:2px 8px; border-radius:999px;
    background:var(--muted); color:var(--ink-soft);
  }
  .ponto { width:6px; height:6px; border-radius:999px }
""",
)

ARQUIVOS["components/cabecalho-pilar.html"] = pagina(
    "Componentes", "Cabeçalho de pilar", "Régua de acento e chip do ícone",
    """  <div class="stack">
    <div class="cab">
      <div class="regua" style="background:var(--financeiro)"></div>
      <div class="linha">
        <span class="chip" style="background:var(--financeiro-soft)">
          <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:var(--financeiro);fill:none;stroke-width:2"><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/></svg>
        </span>
        <div>
          <div style="font-size:22px;font-weight:500;letter-spacing:-.02em">Financeiro</div>
          <div class="nota">Planejado vs. realizado, metas por categoria e investimentos.</div>
        </div>
      </div>
    </div>

    <div class="cab">
      <div class="regua" style="background:var(--estudos)"></div>
      <div class="linha">
        <span class="chip" style="background:var(--estudos-soft)">
          <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:var(--estudos);fill:none;stroke-width:2"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1 2.7 2 6 2s6-1 6-2v-5"/></svg>
        </span>
        <div>
          <div style="font-size:22px;font-weight:500;letter-spacing:-.02em">Estudos</div>
          <div class="nota">Matérias, médias, faltas e sessões de estudo.</div>
        </div>
      </div>
    </div>

    <div class="cab">
      <div class="regua" style="background:var(--treino)"></div>
      <div class="linha">
        <span class="chip" style="background:var(--treino-soft)">
          <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:var(--treino);fill:none;stroke-width:2"><path d="M6 5v14M18 5v14M2 9h4M18 9h4M6 12h12"/></svg>
        </span>
        <div>
          <div style="font-size:22px;font-weight:500;letter-spacing:-.02em">Treino</div>
          <div class="nota">Execuções, progressão de carga e recordes pessoais.</div>
        </div>
      </div>
    </div>
  </div>

  <p class="nota">
    Resolve o problema de pilares indistinguíveis: dá para saber em que página
    você está pela periferia da visão, sem ler o título. Páginas de detalhe usam
    só a régua, sem o chip.
  </p>""",
    css_extra="""
  .cab { display:flex; flex-direction:column; gap:14px }
  .regua { height:3px; width:48px; border-radius:999px }
  .linha { display:flex; align-items:flex-start; gap:12px }
  .chip { display:grid; place-items:center; width:36px; height:36px; border-radius:10px; flex:none; margin-top:2px }
""",
)

ARQUIVOS["components/estado-vazio.html"] = pagina(
    "Componentes", "Estado vazio", "Convite à ação, não aviso",
    """  <div class="vazio">
    <span class="chip" style="background:var(--estudos-soft)">
      <svg viewBox="0 0 24 24" style="width:20px;height:20px;stroke:var(--estudos);fill:none;stroke-width:2"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1 2.7 2 6 2s6-1 6-2v-5"/></svg>
    </span>
    <div style="max-width:360px">
      <p style="margin:0;font-size:14px;font-weight:500">Cadastre a primeira matéria</p>
      <p class="nota" style="margin-top:4px">
        Informe o limite de faltas para o semáforo de risco funcionar. Depois
        adicione as avaliações e os horários no fluxograma.
      </p>
    </div>
    <button class="btn">+ Nova matéria</button>
  </div>

  <p class="nota">
    Antes era card tracejado só com texto: a cópia estava correta, mas nada
    puxava a primeira ação. O ícone é tingido pelo pilar e a ação primária fica
    no próprio bloco, não escondida no cabeçalho.
  </p>""",
    css_extra="""
  .vazio {
    border:1px dashed var(--rule); border-radius:var(--radius);
    display:flex; flex-direction:column; align-items:center; gap:12px;
    padding:40px 24px; text-align:center; background:var(--card);
  }
  .chip { display:grid; place-items:center; width:44px; height:44px; border-radius:12px }
  .btn {
    font-family:var(--sans); font-size:13px; padding:7px 14px; border-radius:6px;
    border:1px solid transparent; background:var(--ink); color:var(--ground); cursor:pointer;
  }
""",
)

ARQUIVOS["components/skeletons.html"] = pagina(
    "Componentes", "Skeletons", "Forma casada por tipo de rota",
    """  <div>
    <p class="rotulo">Card de métricas</p>
    <div class="card" style="flex-direction:row;gap:32px;margin-top:8px">
      <div style="flex:1;display:flex;flex-direction:column;gap:8px"><div class="sk" style="height:10px;width:60%"></div><div class="sk" style="height:24px;width:80%"></div></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:8px"><div class="sk" style="height:10px;width:50%"></div><div class="sk" style="height:24px;width:75%"></div></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:8px"><div class="sk" style="height:10px;width:55%"></div><div class="sk" style="height:24px;width:70%"></div></div>
    </div>
  </div>

  <div>
    <p class="rotulo">Grade de cards</p>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:8px">
      <div class="card" style="flex-direction:row;align-items:center;gap:16px"><div class="sk" style="width:56px;height:56px;border-radius:999px;flex:none"></div><div style="flex:1;display:flex;flex-direction:column;gap:8px"><div class="sk" style="height:12px;width:66%"></div><div class="sk" style="height:10px;width:45%"></div></div></div>
      <div class="card" style="flex-direction:row;align-items:center;gap:16px"><div class="sk" style="width:56px;height:56px;border-radius:999px;flex:none"></div><div style="flex:1;display:flex;flex-direction:column;gap:8px"><div class="sk" style="height:12px;width:66%"></div><div class="sk" style="height:10px;width:45%"></div></div></div>
      <div class="card" style="flex-direction:row;align-items:center;gap:16px"><div class="sk" style="width:56px;height:56px;border-radius:999px;flex:none"></div><div style="flex:1;display:flex;flex-direction:column;gap:8px"><div class="sk" style="height:12px;width:66%"></div><div class="sk" style="height:10px;width:45%"></div></div></div>
    </div>
  </div>

  <div>
    <p class="rotulo">Lista de checks</p>
    <div class="card" style="margin-top:8px;gap:12px">
      <div style="display:flex;gap:10px;align-items:center"><div class="sk" style="width:16px;height:16px;border-radius:4px;flex:none"></div><div class="sk" style="height:12px;width:65%"></div></div>
      <div style="display:flex;gap:10px;align-items:center"><div class="sk" style="width:16px;height:16px;border-radius:4px;flex:none"></div><div class="sk" style="height:12px;width:57%"></div></div>
      <div style="display:flex;gap:10px;align-items:center"><div class="sk" style="width:16px;height:16px;border-radius:4px;flex:none"></div><div class="sk" style="height:12px;width:49%"></div></div>
    </div>
  </div>

  <p class="nota">
    Quatro variantes escolhidas por rota. A forma imita a do conteúdo real para
    que nada salte quando os dados chegam — era esse salto, não o tempo de
    espera, o maior dano à percepção de qualidade.
  </p>""",
    css_extra="""
  @keyframes shimmer { to { background-position:-200% 0 } }
  .sk {
    border-radius:4px;
    background:linear-gradient(90deg,var(--rule) 25%,color-mix(in oklab,var(--rule) 45%,var(--ground)) 50%,var(--rule) 75%);
    background-size:200% 100%; animation:shimmer 1.4s linear infinite;
  }
""",
)

ARQUIVOS["components/navegacao.html"] = pagina(
    "Navegação", "Sidebar e barra inferior", "Trilha que abre ao aproximar; mobile na base",
    """  <div class="row" style="align-items:flex-start;gap:20px">
    <div>
      <p class="rotulo">Recolhida — trilha</p>
      <div class="sb" style="width:56px;margin-top:8px">
        <div class="sb-item"><span class="ic"></span></div>
        <div class="sb-item ativo"><span class="ic" style="background:var(--financeiro)"></span></div>
        <div class="sb-item"><span class="ic"></span></div>
        <div class="sb-item"><span class="ic"></span></div>
      </div>
    </div>

    <div>
      <p class="rotulo">Aberta — hover ou fixada</p>
      <div class="sb" style="width:200px;margin-top:8px">
        <div class="sb-item"><span class="ic"></span><span>Home</span></div>
        <div class="sb-item ativo"><span class="ic" style="background:var(--financeiro)"></span><span>Financeiro</span></div>
        <div class="sb-item"><span class="ic"></span><span>Estudos</span></div>
        <div class="sb-item"><span class="ic"></span><span>Treino</span></div>
      </div>
    </div>
  </div>

  <div>
    <p class="rotulo">Barra inferior — mobile</p>
    <div class="bn">
      <div><span class="ic"></span>Home</div>
      <div class="on"><span class="ic" style="background:var(--financeiro)"></span>Grana<i style="background:var(--financeiro)"></i></div>
      <div><span class="ic"></span>Estudo</div>
      <div><span class="ic"></span>Treino</div>
      <div><span class="ic"></span>Projeto</div>
      <div><span class="ic"></span>Agenda</div>
    </div>
  </div>

  <p class="nota">
    Recolhida, a sidebar abre ao aproximar o ponteiro e sobrepõe o conteúdo em
    vez de empurrá-lo. Abrir é imediato; recolher tem 220ms de atraso, senão
    fica nervoso quando o mouse passa em diagonal. Expande também no foco, para
    quem navega por teclado. No mobile os rótulos são curtos: "Financ…"
    truncado é pior que uma palavra inteira mais curta.
  </p>""",
    css_extra="""
  .sb {
    background:var(--surface); border:1px solid var(--rule); border-radius:var(--radius);
    padding:8px; display:flex; flex-direction:column; gap:2px;
  }
  .sb-item {
    display:flex; align-items:center; gap:8px; padding:7px 8px; border-radius:6px;
    font-size:13px; color:var(--ink-soft); justify-content:flex-start;
  }
  .sb[style*="56px"] .sb-item { justify-content:center; padding:7px 0 }
  .sb-item.ativo { background:var(--muted); color:var(--ink); font-weight:500 }
  .ic { width:15px; height:15px; border-radius:4px; background:currentColor; opacity:.45; flex:none }
  .sb-item.ativo .ic, .on .ic { opacity:1 }
  .bn {
    display:flex; background:var(--surface); border:1px solid var(--rule);
    border-radius:var(--radius); margin-top:8px; max-width:420px;
  }
  .bn > div {
    flex:1; display:flex; flex-direction:column; align-items:center; gap:3px;
    padding:8px 2px; font-size:10px; color:var(--ink-soft); position:relative;
  }
  .bn > div.on { color:var(--ink) }
  .bn i { position:absolute; top:26px; width:16px; height:2px; border-radius:999px }
""",
)

ARQUIVOS["components/formularios.html"] = pagina(
    "Componentes", "Formulários", "Lançamento rápido, campos, seletor de cor",
    """  <div class="card">
    <p class="rotulo">Lançamento em uma linha</p>
    <div class="row" style="gap:8px;margin-top:4px">
      <div style="position:relative;flex:1;min-width:140px">
        <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:13px;color:var(--ink-soft)">R$</span>
        <input class="in metric-sm" style="padding-left:36px" placeholder="0,00">
      </div>
      <select class="in" style="width:170px"><option>Delivery</option></select>
      <span class="nota">⏎ Enter para lançar hoje</span>
    </div>
    <p class="nota">
      Eram 6 interações pelo diálogo completo; agora são 2. A categoria vem da
      última usada, e o foco permanece no campo após salvar.
    </p>
  </div>

  <div class="card">
    <p class="rotulo">Campos e botões</p>
    <div class="row" style="gap:8px">
      <input class="in" style="width:180px" placeholder="Ex: Mercado">
      <input class="in" style="width:120px" type="date">
      <button class="btn">Salvar</button>
      <button class="btn sec">Categoria</button>
      <button class="btn ghost">Cancelar</button>
    </div>
  </div>

  <div class="card">
    <p class="rotulo">Seletor de cor — paleta fixa</p>
    <div class="row" style="gap:6px">
      <span class="sw sem">⊘</span>
      <span class="sw" style="background:#4f9d69"></span>
      <span class="sw" style="background:#4a9c9c"></span>
      <span class="sw sel" style="background:#4a87c4">✓</span>
      <span class="sw" style="background:#8b6bb5"></span>
      <span class="sw" style="background:#c4708f"></span>
      <span class="sw" style="background:#c4554d"></span>
      <span class="sw" style="background:#d0764b"></span>
      <span class="sw" style="background:#b8941f"></span>
      <span class="sw" style="background:#8f6b4f"></span>
      <span class="sw" style="background:#787774"></span>
    </div>
    <p class="nota">
      Substituiu a entrada livre de hex: garante que a cor gravada pertença ao
      design system e siga legível nos dois temas.
    </p>
  </div>""",
    css_extra="""
  .in {
    font-family:var(--sans); font-size:13px; height:36px; padding:0 10px;
    border:1px solid var(--rule); border-radius:6px;
    background:var(--card); color:var(--ink); width:100%;
  }
  .btn {
    font-family:var(--sans); font-size:13px; padding:7px 14px; border-radius:6px;
    border:1px solid transparent; background:var(--ink); color:var(--ground); cursor:pointer;
  }
  .btn.sec { background:var(--muted); color:var(--ink); border-color:var(--rule) }
  .btn.ghost { background:transparent; color:var(--ink-soft) }
  .sw {
    width:28px; height:28px; border-radius:999px; display:grid; place-items:center;
    color:#fff; font-size:12px;
  }
  .sw.sem { border:1px solid var(--rule); color:var(--ink-soft) }
  .sw.sel { outline:2px solid color-mix(in oklab,var(--ink) 50%,transparent); outline-offset:2px }
""",
)

ARQUIVOS["components/fluxograma.html"] = pagina(
    "Componentes", "Grade de fluxograma", "Padrão semanal, compartilhado por Estudos e Treino",
    """  <div class="grade">
    <div><p class="rotulo">Segunda</p>
      <div class="it"><span class="pt" style="background:var(--estudos)"></span><div><div>Cálculo II</div><div class="hh">08:00–10:00</div></div></div>
      <div class="it"><span class="pt" style="background:var(--treino)"></span><div><div>Treino A</div><div class="hh">19:00–20:30</div></div></div>
    </div>
    <div><p class="rotulo">Terça</p>
      <div class="it"><span class="pt" style="background:var(--estudos)"></span><div><div>Física I</div><div class="hh">10:00–12:00</div></div></div>
      <div class="it"><span class="pt" style="background:var(--estudos)"></span><div><div>Algoritmos</div><div class="hh">14:00–16:00</div></div></div>
    </div>
    <div><p class="rotulo">Quarta</p>
      <div class="it"><span class="pt" style="background:var(--estudos)"></span><div><div>Cálculo II</div><div class="hh">08:00–10:00</div></div></div>
      <div class="it"><span class="pt" style="background:var(--treino)"></span><div><div>Treino B</div><div class="hh">19:00–20:30</div></div></div>
    </div>
    <div><p class="rotulo">Quinta</p>
      <div class="it"><span class="pt" style="background:var(--estudos)"></span><div><div>Física I</div><div class="hh">10:00–12:00</div></div></div>
      <div class="vazio">—</div>
    </div>
  </div>

  <p class="nota">
    Uma tabela só, compartilhada pelos dois pilares: a cor sai de qual chave
    estrangeira está preenchida. A recorrência não é materializada no banco — o
    cliente expande em ocorrências datadas só para o intervalo visível.
  </p>""",
    css_extra="""
  .grade { display:grid; grid-template-columns:repeat(4,1fr); gap:12px }
  .grade > div { display:flex; flex-direction:column; gap:6px }
  .it {
    display:flex; gap:6px; align-items:flex-start;
    border:1px solid var(--rule); border-radius:6px; padding:7px 9px;
    background:var(--card); font-size:12px;
  }
  .pt { width:6px; height:6px; border-radius:999px; margin-top:5px; flex:none }
  .hh { font-family:var(--mono); font-size:11px; color:var(--ink-soft) }
  .vazio { font-size:12px; color:var(--ink-soft); opacity:.6 }
""",
)

for caminho, conteudo in ARQUIVOS.items():
    destino = SAIDA / caminho
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(conteudo, encoding="utf-8")
    print(f"{caminho:<40} {len(conteudo):>6} bytes")

print(f"\n{len(ARQUIVOS)} cards gerados em {SAIDA}/")
