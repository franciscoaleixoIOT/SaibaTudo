// Sincroniza com a API as duas fontes compartilhadas que ela consome offline:
//   1. os léxicos por idioma (contracts/lexico/<idioma>.json: padrões de segurança, formas de propriedade, unidades...);
//   2. os nomes dos elementos em es/de/fr (data/quimica/elementos.json, campo `nomes`; pt-BR e en já estão em vocab.js).
//
//   node _lib/lexico/sincronizar.mjs            # (da pasta api/) reescreve os módulos de _lib/lexico/
//   node _lib/lexico/sincronizar.mjs --check    # só confere; código de saída 1 se algum estiver desatualizado
//
// Por que cópias geradas e não leitura direta: o deploy da Vercel NÃO leva contracts/ (.vercelignore) e uma função só enxerga o que o
// bundler rastreia pelos `import` estáticos. Um módulo JS gerado é rastreado sem configuração e dispensa `import ... with {type:'json'}`.
// Léxicos: mesmo formato dos do site (web/src/quimica/js/nlu/lex/<idioma>.js): cabeçalho + `export default <JSON com indent 1>;`.
// Os arquivos gerados NÃO devem ser editados à mão: mude a fonte e rode de novo (test/lexico.test.mjs falha se estiverem defasados).

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const IDIOMAS = Object.freeze(['pt-BR', 'en', 'es', 'de', 'fr']);
export const IDIOMAS_NOMES = Object.freeze(['es', 'de', 'fr']);

const CABECALHO = (idioma) => `// gerado — não editar. Fonte: contracts/lexico/${idioma}.json (api/_lib/lexico/sincronizar.mjs). Regexes como texto; _lib/lexico.js compila.\n`;
const CABECALHO_NOMES = '// gerado — não editar. Fonte: data/quimica/elementos.json, campo `nomes` (api/_lib/lexico/sincronizar.mjs). Símbolo -> nome por idioma (es, de, fr).\n';

const urlContrato = (idioma) => new URL(`../../../contracts/lexico/${idioma}.json`, import.meta.url);
const urlGerado = (idioma) => new URL(`./${idioma}.js`, import.meta.url);
const urlElementos = new URL('../../../data/quimica/elementos.json', import.meta.url);
const urlNomes = new URL('./nomes-elementos.js', import.meta.url);

/** O texto que o módulo gerado de `idioma` deve ter, ou null se o contrato não existe neste checkout. */
export function textoGerado(idioma) {
  const origem = urlContrato(idioma);
  if (!existsSync(origem)) return null;
  const dados = JSON.parse(readFileSync(origem, 'utf8'));
  return `${CABECALHO(idioma)}export default ${JSON.stringify(dados, null, 1)};\n`;
}

/** O texto de nomes-elementos.js, ou null se o pacote de dados não existe neste checkout. */
export function textoNomes() {
  if (!existsSync(urlElementos)) return null;
  const elementos = JSON.parse(readFileSync(urlElementos, 'utf8'));
  const saida = {};
  for (const e of elementos) {
    if (!e.simbolo || !e.nomes) continue;
    const nomes = {};
    for (const idioma of IDIOMAS_NOMES) if (typeof e.nomes[idioma] === 'string' && e.nomes[idioma].trim()) nomes[idioma] = e.nomes[idioma].trim();
    saida[e.simbolo] = nomes;
  }
  return `${CABECALHO_NOMES}export default ${JSON.stringify(saida, null, 1)};\n`;
}

const difere = (esperado, url) => esperado !== null && (!existsSync(url) || readFileSync(url, 'utf8') !== esperado);

/** Arquivos gerados que diferem da fonte (ou não existem). Fonte ausente neste checkout = nada a conferir. */
export function desatualizados() {
  const velhos = IDIOMAS.filter((idioma) => difere(textoGerado(idioma), urlGerado(idioma))).map((idioma) => `${idioma}.js`);
  if (difere(textoNomes(), urlNomes)) velhos.push('nomes-elementos.js');
  return velhos;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--check')) {
    const velhos = desatualizados();
    if (velhos.length > 0) {
      console.error(`módulos gerados da API desatualizados: ${velhos.join(', ')} — rode: node _lib/lexico/sincronizar.mjs`);
      process.exit(1);
    }
    console.log('módulos gerados da API em dia');
  } else {
    for (const idioma of IDIOMAS) {
      const texto = textoGerado(idioma);
      if (texto === null) throw new Error(`contracts/lexico/${idioma}.json não encontrado`);
      writeFileSync(urlGerado(idioma), texto, 'utf8');
    }
    const nomes = textoNomes();
    if (nomes === null) throw new Error('data/quimica/elementos.json não encontrado');
    writeFileSync(urlNomes, nomes, 'utf8');
    console.log(`gerados ${IDIOMAS.length} léxicos e nomes-elementos.js em _lib/lexico/`);
  }
}
