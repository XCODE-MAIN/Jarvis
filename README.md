<div align="center">

<img src="build/icon.png" width="120" alt="Jarvis logo">

# Jarvis

**An open-source AI assistant that controls your PC by text or voice.**
Say *"organize my Downloads"* or *"open Spotify"* and it just happens.

[English](README.md) · [Português](README.pt.md)

![License](https://img.shields.io/badge/license-MIT-white?style=flat-square&labelColor=111)
![Electron](https://img.shields.io/badge/Electron-33-white?style=flat-square&labelColor=111&logo=electron&logoColor=white)
![Platform](https://img.shields.io/badge/Windows%20%7C%20Linux%20%7C%20macOS-white?style=flat-square&labelColor=111)
![Powered by Groq](https://img.shields.io/badge/powered%20by-Groq-white?style=flat-square&labelColor=111)

</div>

---

## What is Jarvis?

Jarvis is a small desktop app with a chat window and a microphone button. You tell it what you want in plain language, and it decides which action to run on your computer: open an app, search the web, tidy a folder, check your system and more.

It runs on [Groq](https://groq.com), so answers are fast, and it understands your voice with Whisper. Everything that changes your files or runs commands asks for your permission first.

> The interface and the assistant's replies are in Portuguese for now. Jarvis understands English too, and translations are on the roadmap.

## Features

- **Text and voice.** Type, or press the microphone and speak.
- **Real actions on your PC.** It does not just explain how, it does it.
- **Asks before it acts.** Moving files and running commands always show a confirmation dialog.
- **Spoken replies.** Optional text-to-speech for the answers.
- **Global shortcut.** `Ctrl + Shift + J` shows or hides the window from anywhere.
- **Clean black and white "liquid glass" design.** The orb at the top shows what Jarvis is doing: thinking, listening or speaking.
- **Easy to extend.** Adding a new tool takes one function and one description.

## What Jarvis can do

| Tool | What it does | Asks permission? |
| --- | --- | :---: |
| `open_app` | Opens an installed application | No |
| `open_url` | Opens a web link in your browser | No |
| `web_search` | Searches the web in your browser | No |
| `list_files` | Lists the files in a folder | No |
| `read_file` | Reads a small text file (up to 2 MB) | No |
| `organize_folder` | Sorts files into subfolders by type | **Yes** |
| `system_info` | Shows CPU, RAM and uptime | No |
| `run_command` | Runs a shell command | **Yes** |

Examples you can try:

- "Organize my Downloads"
- "What's on my Desktop?"
- "How is my PC doing?"
- "Open the calculator"
- "Search for today's news"
- "Read the file C:\notes\todo.txt and summarize it"

## Getting started

### 1. Requirements

- [Node.js](https://nodejs.org) 18 or newer
- A free Groq API key (see the next section)

### 2. Install and run

```bash
git clone https://github.com/xpereira7/jarvis.git
cd jarvis
npm install
npm start
```

The first time you open Jarvis it asks for your Groq key. Paste it and press **Save**. You can change it later with the gear icon.

## How to get a free Groq API key

Jarvis needs a Groq key to think and to understand your voice. It is free to create and takes about one minute.

1. Go to **[console.groq.com](https://console.groq.com)** and sign up (or log in).
2. Open **[API Keys](https://console.groq.com/keys)** in the menu.
3. Click **Create API Key**, give it a name such as `jarvis` and confirm.
4. **Copy the key right away.** It starts with `gsk_` and Groq only shows it once.
5. Open Jarvis, paste the key in the setup window and click **Save**.

Notes:

- Groq has a free tier with usage limits. If you hit a limit, wait a bit and try again.
- Never share your key or commit it to GitHub. Jarvis stores it on your machine only, encrypted when your system supports it, and never inside the project folder.
- If a key stops working, create a new one and paste it in the settings.

## Choosing the model

By default Jarvis uses `llama-3.3-70b-versatile`. You can change it in the settings (gear icon). The model must support tool calling. Groq's `openai/gpt-oss-120b` and `openai/gpt-oss-20b` are good alternatives. Groq updates its model list often, so check [console.groq.com/docs/models](https://console.groq.com/docs/models) if a model stops being available.

Voice recognition uses `whisper-large-v3-turbo`.

## Build an installer or `.exe`

```bash
npm run dist
```

The result is in the `dist` folder (a Windows installer, or an AppImage and `.deb` on Linux).

For a single `.exe` that runs without installing, change this line in `package.json`:

```json
"win": { "target": ["nsis"], "icon": "build/icon.ico" }
```

to:

```json
"win": { "target": ["portable"], "icon": "build/icon.ico" }
```

## How it works

```
You ──► Chat window ──► Groq (LLM) ──► decides which tool to call
                              ▲                    │
                              │                    ▼
                        tool result ◄──── Jarvis runs it on your PC
                                          (asking you first if needed)
```

1. You type or speak. Audio is transcribed with Whisper.
2. Your message and the available tools are sent to Groq.
3. The model replies with text or asks to use a tool.
4. Jarvis runs the tool locally and sends the result back to the model.
5. This repeats for up to 6 steps, then you get the final answer.

## Project structure

```
jarvis/
├── main.js            Main process: window, tools and the Groq connection
├── preload.js         Safe bridge between the interface and the main process
├── package.json
├── build/             App icon (svg, png and ico)
├── renderer/
│   ├── index.html     Interface layout
│   ├── style.css      Black and white liquid glass design
│   ├── app.js         Chat, voice and settings logic
│   ├── logo.png
│   └── fonts/         Geist typeface (bundled, works offline)
├── README.md
├── README.pt.md
├── LICENSE
└── .gitignore
```

## Add your own tool

Open `main.js` and add two things.

**1. The function, inside `TOOL_IMPL`:**

```js
async open_folder({ path: p }) {
  const dir = resolvePath(p);
  await shell.openPath(dir);
  return `Opened: ${dir}`;
},
```

**2. Its description, inside `TOOLS`:**

```js
fn('open_folder', 'Opens a folder in the file explorer', { path: str('Folder') }, ['path']),
```

That's it. The model can now use it on its own. If the tool changes something on the user's machine, ask for confirmation first, like `organize_folder` does.

## Privacy and security

- Your messages, the voice recordings you make, and the results of tools (such as file lists or the text of a file you ask it to read) are sent to Groq to produce the answers. Do not ask Jarvis to read files with secrets.
- Moving files and running commands always require your confirmation.
- The interface has no direct access to your system. Everything goes through `preload.js`.
- Only `http` and `https` links can be opened.
- Your API key is encrypted with the operating system when available and is stored outside the project.

## Troubleshooting

**`npm install` says `package.json` was not found.**
You are in the wrong folder. Make sure the folder you are in contains `package.json`. When unzipping, it is common to end up with `jarvis/jarvis`.

**The microphone does not work.**
Allow microphone access for apps in your system privacy settings, then restart Jarvis.

**`npm run dist` fails with a symbolic link error on Windows.**
Open the terminal as Administrator, or turn on Developer Mode in Windows settings, and run it again.

**On Linux the window has no blur or a solid background.**
Transparency and blur depend on your desktop compositor. Jarvis still works, it just looks flatter.

**On Linux Electron complains about the sandbox.**
Run `npm start -- --no-sandbox`.

**"The Groq key was rejected."**
Create a new key at [console.groq.com/keys](https://console.groq.com/keys) and paste it in the settings.

## Roadmap

- [ ] Plugin folder so anyone can add tools without touching `main.js`
- [ ] Local models with Ollama
- [ ] Volume, brightness and window control
- [ ] Wake word ("Hey Jarvis")
- [ ] English interface and more languages
- [ ] Conversation history

## Contributing

Contributions are welcome. Open an issue to report a bug or suggest something, or send a pull request.

1. Fork the repository
2. Create a branch: `git checkout -b my-feature`
3. Commit your changes and open a pull request

## License

[MIT](LICENSE) © 2026 Xavier Pereira

The Geist typeface is by Vercel and licensed under the SIL Open Font License 1.1. A copy is in `renderer/fonts`.
