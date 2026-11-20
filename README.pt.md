<div align="center">

<img src="build/icon.png" width="120" alt="Logo do Jarvis">

# Jarvis

**Um assistente de IA open source que controla o teu PC por texto ou voz.**
Diz *"organiza as minhas Transferências"* ou *"abre o Spotify"* e ele faz.

[English](README.md) · [Português](README.pt.md)

![Licença](https://img.shields.io/badge/licen%C3%A7a-MIT-white?style=flat-square&labelColor=111)
![Electron](https://img.shields.io/badge/Electron-33-white?style=flat-square&labelColor=111&logo=electron&logoColor=white)
![Plataforma](https://img.shields.io/badge/Windows%20%7C%20Linux%20%7C%20macOS-white?style=flat-square&labelColor=111)
![Powered by Groq](https://img.shields.io/badge/powered%20by-Groq-white?style=flat-square&labelColor=111)

</div>

---

## O que é o Jarvis?

O Jarvis é uma pequena aplicação de ambiente de trabalho com uma janela de chat e um botão de microfone. Dizes o que queres em linguagem normal e ele decide que ação executar no teu computador: abrir uma app, pesquisar na web, arrumar uma pasta, ver o estado do sistema e mais.

Funciona com a [Groq](https://groq.com), por isso as respostas são rápidas, e percebe a tua voz com o Whisper. Tudo o que mexe nos teus ficheiros ou executa comandos pede a tua permissão primeiro.

## Funcionalidades

- **Texto e voz.** Escreve, ou carrega no microfone e fala.
- **Ações reais no PC.** Não se limita a explicar como se faz, faz mesmo.
- **Pede antes de agir.** Mover ficheiros e executar comandos mostram sempre uma janela de confirmação.
- **Respostas em voz alta.** Leitura das respostas, se quiseres.
- **Atalho global.** `Ctrl + Shift + J` mostra ou esconde a janela de qualquer sítio.
- **Visual limpo, preto e branco, estilo "liquid glass".** A esfera no topo mostra o que o Jarvis está a fazer: a pensar, a ouvir ou a falar.
- **Fácil de estender.** Acrescentar uma ferramenta nova custa uma função e uma descrição.

## O que o Jarvis sabe fazer

| Ferramenta | O que faz | Pede permissão? |
| --- | --- | :---: |
| `open_app` | Abre uma aplicação instalada | Não |
| `open_url` | Abre um link no browser | Não |
| `web_search` | Pesquisa na web no browser | Não |
| `list_files` | Lista os ficheiros de uma pasta | Não |
| `read_file` | Lê um ficheiro de texto pequeno (até 2 MB) | Não |
| `organize_folder` | Arruma ficheiros em subpastas por tipo | **Sim** |
| `system_info` | Mostra CPU, RAM e tempo ligado | Não |
| `run_command` | Executa um comando na shell | **Sim** |

Exemplos para experimentares:

- "Organiza as minhas Transferências"
- "O que há na minha Secretária?"
- "Como está o meu PC?"
- "Abre a calculadora"
- "Pesquisa as notícias de hoje"
- "Lê o ficheiro C:\notas\tarefas.txt e faz um resumo"

## Começar

### 1. Requisitos

- [Node.js](https://nodejs.org) 18 ou mais recente
- Uma chave gratuita da Groq (vê a secção seguinte)

### 2. Instalar e correr

```bash
git clone https://github.com/xpereira7/jarvis.git
cd jarvis
npm install
npm start
```

Na primeira vez que abres o Jarvis, ele pede a chave da Groq. Cola-a e carrega em **Guardar**. Podes mudá-la depois no ícone da engrenagem.

## Como criar uma chave gratuita da Groq

O Jarvis precisa de uma chave da Groq para pensar e para perceber a tua voz. É grátis e demora cerca de um minuto.

1. Vai a **[console.groq.com](https://console.groq.com)** e cria conta (ou inicia sessão).
2. Abre **[API Keys](https://console.groq.com/keys)** no menu.
3. Clica em **Create API Key**, dá-lhe um nome, por exemplo `jarvis`, e confirma.
4. **Copia a chave logo.** Começa por `gsk_` e a Groq só a mostra uma vez.
5. Abre o Jarvis, cola a chave na janela de configuração e clica em **Guardar**.

Notas:

- A Groq tem um plano gratuito com limites de utilização. Se atingires o limite, espera um pouco e tenta de novo.
- Nunca partilhes a chave nem a ponhas no GitHub. O Jarvis guarda-a só no teu computador, cifrada quando o sistema permite, e nunca dentro da pasta do projeto.
- Se uma chave deixar de funcionar, cria outra e cola-a nas definições.

## Escolher o modelo

Por omissão o Jarvis usa `llama-3.3-70b-versatile`. Podes mudá-lo nas definições (ícone da engrenagem). O modelo tem de suportar chamadas de ferramentas. Os modelos `openai/gpt-oss-120b` e `openai/gpt-oss-20b` da Groq são boas alternativas. A Groq atualiza a lista de modelos com frequência, por isso consulta [console.groq.com/docs/models](https://console.groq.com/docs/models) se um modelo deixar de estar disponível.

O reconhecimento de voz usa `whisper-large-v3-turbo`.

## Criar instalador ou `.exe`

```bash
npm run dist
```

O resultado fica na pasta `dist` (um instalador no Windows, ou AppImage e `.deb` no Linux).

Para um único `.exe` que corre sem instalar, muda esta linha no `package.json`:

```json
"win": { "target": ["nsis"], "icon": "build/icon.ico" }
```

para:

```json
"win": { "target": ["portable"], "icon": "build/icon.ico" }
```

## Como funciona

```
Tu ──► Janela de chat ──► Groq (LLM) ──► decide que ferramenta chamar
                                ▲                    │
                                │                    ▼
                      resultado da ferramenta ◄── O Jarvis executa no teu PC
                                                  (pede-te autorização se for preciso)
```

1. Escreves ou falas. O áudio é transcrito com o Whisper.
2. A tua mensagem e as ferramentas disponíveis são enviadas à Groq.
3. O modelo responde com texto ou pede para usar uma ferramenta.
4. O Jarvis executa a ferramenta localmente e devolve o resultado ao modelo.
5. Isto repete-se até 6 passos e depois recebes a resposta final.

## Estrutura do projeto

```
jarvis/
├── main.js            Processo principal: janela, ferramentas e ligação à Groq
├── preload.js         Ponte segura entre a interface e o processo principal
├── package.json
├── build/             Ícone da app (svg, png e ico)
├── renderer/
│   ├── index.html     Estrutura da interface
│   ├── style.css      Design liquid glass preto e branco
│   ├── app.js         Lógica do chat, da voz e das definições
│   ├── logo.png
│   └── fonts/         Tipo de letra Geist (incluído, funciona offline)
├── README.md
├── README.pt.md
├── LICENSE
└── .gitignore
```

## Acrescentar uma ferramenta tua

Abre o `main.js` e acrescenta duas coisas.

**1. A função, dentro de `TOOL_IMPL`:**

```js
async open_folder({ path: p }) {
  const dir = resolvePath(p);
  await shell.openPath(dir);
  return `Aberta: ${dir}`;
},
```

**2. A descrição, dentro de `TOOLS`:**

```js
fn('open_folder', 'Abre uma pasta no explorador de ficheiros', { path: str('Pasta') }, ['path']),
```

Pronto. O modelo já a pode usar sozinho. Se a ferramenta alterar algo no computador do utilizador, pede confirmação primeiro, como faz a `organize_folder`.

## Privacidade e segurança

- As tuas mensagens, as gravações de voz que fazes e os resultados das ferramentas (como listas de ficheiros ou o texto de um ficheiro que peças para ler) são enviados à Groq para gerar as respostas. Não peças ao Jarvis para ler ficheiros com segredos.
- Mover ficheiros e executar comandos exigem sempre a tua confirmação.
- A interface não tem acesso direto ao sistema. Tudo passa pelo `preload.js`.
- Só é possível abrir links `http` e `https`.
- A chave da API é cifrada com o sistema operativo quando possível e fica guardada fora do projeto.

## Resolução de problemas

**O `npm install` diz que não encontra o `package.json`.**
Estás na pasta errada. Confirma que a pasta onde estás tem o `package.json`. Ao extrair o zip é comum ficar `jarvis/jarvis`.

**O microfone não funciona.**
Permite o acesso ao microfone para aplicações nas definições de privacidade do sistema e reinicia o Jarvis.

**O `npm run dist` falha com um erro de ligação simbólica no Windows.**
Abre o terminal como Administrador, ou ativa o Modo de Programador nas definições do Windows, e corre de novo.

**No Linux a janela não tem desfoque ou tem fundo sólido.**
A transparência e o desfoque dependem do compositor do ambiente de trabalho. O Jarvis funciona na mesma, só fica mais plano.

**No Linux o Electron queixa-se da sandbox.**
Corre `npm start -- --no-sandbox`.

**"A chave da Groq foi recusada."**
Cria uma nova em [console.groq.com/keys](https://console.groq.com/keys) e cola-a nas definições.

## Plano futuro

- [ ] Pasta de plugins para qualquer pessoa acrescentar ferramentas sem mexer no `main.js`
- [ ] Modelos locais com Ollama
- [ ] Controlo de volume, brilho e janelas
- [ ] Palavra de ativação ("Olá Jarvis")
- [ ] Interface em inglês e mais idiomas
- [ ] Histórico de conversas

## Contribuir

Contribuições são bem-vindas. Abre uma issue para reportar um erro ou sugerir algo, ou envia um pull request.

1. Faz fork do repositório
2. Cria um ramo: `git checkout -b a-minha-funcionalidade`
3. Faz commit das alterações e abre um pull request

## Licença

[MIT](LICENSE) © 2026 Xavier Pereira

O tipo de letra Geist é da Vercel e tem licença SIL Open Font License 1.1. Há uma cópia em `renderer/fonts`.
