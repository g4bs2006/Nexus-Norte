// Execute com Playwright disponível (NODE_PATH também é aceito) e o app iniciado.
// NEXUS_TEST_URL permite verificar o mesmo fluxo no deploy. Toda API é simulada.
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const pausa = ms => new Promise(resolve => setTimeout(resolve, ms))
async function esperar(verificar, mensagem) {
  for (let i = 0; i < 100; i++) {
    if (await verificar()) return
    await pausa(100)
  }
  throw new Error(mensagem)
}
;(async () => {
 const browser = await chromium.launch({channel:process.env.NEXUS_TEST_BROWSER || 'msedge',headless:true})
 try {
  const page = await browser.newPage({viewport:{width:1440,height:1000},serviceWorkers:'block'})
  const errors=[]; const writes=[]
  let offline=false
  page.on('pageerror',e=>errors.push(e.message))
  page.on('dialog',dialog=>dialog.accept())
  const note={id:'11111111-1111-4111-8111-111111111111',materia_id:'22222222-2222-4222-8222-222222222222',titulo:'Nota teste',slug:'nota-teste',conteudo:'Texto inicial',conteudo_busca:'Texto inicial',fixada:false,sessao_id:null,criada_em:new Date().toISOString(),atualizada_em:new Date().toISOString(),materias:{nome:'Teste'},notas_topicos:[]}
  await page.route('**/rest/v1/**', async route=>{
   const req=route.request(); const url=new URL(req.url()); let response=[]
   if(url.pathname.endsWith('/notas_estudo')) {
    if(req.method()==='PATCH'){
     if(offline) return route.abort('internetdisconnected')
     const data=req.postDataJSON(); writes.push(data); Object.assign(note,data)
     response=url.searchParams.get('select')==='id'?{id:note.id}:note
    } else response=url.searchParams.has('slug')?note:[note]
   }
   if(url.pathname.endsWith('/materias')) response=[{id:note.materia_id,nome:'Teste',cor:'#ffffff',semestre_id:null}]
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(response)})
  })
  const base=process.env.NEXUS_TEST_URL || 'http://127.0.0.1:5173'
  await page.goto(base+'/notas/nota-teste')
  const editor=page.locator('.editor-markdown[contenteditable=true]')
  await editor.waitFor({timeout:60000})
  await editor.click(); await page.keyboard.press('Control+End')
  for(const trecho of [' primeira escrita',' segunda escrita',' terceira escrita']) {
   const antes=writes.length
   await page.keyboard.type(trecho,{delay:15})
   await esperar(()=>writes.length>antes && note.conteudo.includes(trecho),'Salvamento sucessivo falhou: '+trecho)
  }
  console.log('PASS: três salvamentos consecutivos no editor real')
  await page.keyboard.press('Enter'); await page.keyboard.type('/')
  await page.getByRole('option',{name:'Título 1',exact:false}).waitFor()
  await page.keyboard.press('Enter'); await page.keyboard.type('Título pelo menu')
  await esperar(()=>editor.locator('h1').count(), 'O comando / não criou o título')
  await esperar(()=>note.conteudo.includes('# Título pelo menu'),'Título do menu não foi salvo')
  console.log('PASS: / abre o menu, seleciona pelo teclado e salva o bloco')
  await page.keyboard.press('Enter'); await page.keyboard.type('//alpha',{delay:30})
  await page.getByRole('listbox',{name:'Símbolos e Comandos'}).waitFor()
  assert.equal(await page.getByRole('listbox',{name:'Símbolos e Comandos'}).count(),1)
  await page.keyboard.press('Enter')
  await esperar(()=>note.conteudo.includes('\\alpha'),'Símbolo // não foi inserido e salvo')
  console.log('PASS: // abre um único menu e insere/salva a fórmula')
  await page.keyboard.press('Control+End'); await page.keyboard.press('Enter')
  offline=true
  await page.keyboard.insertText('Texto protegido antes de sair')
  await page.reload()
  await editor.waitFor({timeout:60000})
  await esperar(async()=>(await editor.innerText()).includes('Texto protegido antes de sair'),'Rascunho não foi recuperado')
  offline=false
  await page.evaluate(()=>window.dispatchEvent(new Event('online')))
  await esperar(()=>note.conteudo.includes('Texto protegido antes de sair'),'Rascunho recuperado não sincronizou')
  await editor.click(); await page.keyboard.press('Control+End'); await page.keyboard.type(' e continuei escrevendo')
  await esperar(()=>note.conteudo.includes('e continuei escrevendo'),'Salvamento parou após recuperar o rascunho')
  assert.deepEqual(errors,[])
  console.log('PASS: saída imediata com falha de rede, recuperação e novas gravações; nenhum erro no navegador')
 } finally { await browser.close() }
})().catch(e=>{console.error(e);process.exit(1)})
