# BountyWatch

BountyWatch is a Chrome extension that automatically detects bug bounty programs on the pages you visit. It scans the content of every page, recognizes bounty-related keywords ("bounty", "reward", "monetary compensation", "eligible targets", etc.), and once a page looks like a bug bounty program it saves it to your tracked list with the page's favicon, title, and URL.

It also lets you send all tracked programs to ChatGPT in one click so you can get a normalized, structured (JSON) overview of every program: reward ranges, in-scope/out-of-scope domains, and more.

## Demo
<img width="1596" height="965" alt="image" src="https://github.com/user-attachments/assets/1c3dd6a0-6fad-4223-8194-d8435bda5f3b" />

<img width="835" height="1076" alt="image" src="https://github.com/user-attachments/assets/0d9977b0-7f17-4717-b389-220e67069c55" />



## Features

- **Automatic detection** – visit any page; if it's a bug bounty program it is added to your tracked list automatically.
- **Tracked list** – open the extension popup to see all detected programs (favicon, title, URL) with search and clear.
- **Copy list** – copy all detected programs as JSON.
- **Send to ChatGPT** – one click opens ChatGPT with a file attachment containing your tracked programs plus a fixed extraction prompt. ChatGPT reads the official `program_url` of each program and replies with a single ` ```json ``` ` code block of normalized records (reward, in-scope/out-of-scope domains, platform, etc.).
- **Slim storage** – only favicon, title, and URL are stored per program; nothing else leaves your browser except when you explicitly copy or send.

## Requirements

- Google Chrome (a recent version that supports Manifest V3).

## Installation (load as unpacked extension)

1. **Download the code**
   - Clone or download this repository into a folder on your computer, e.g. `BountyWatch`.
   - Inside the folder you must see `manifest.json` (this is the extension's "entry point").

2. **Open the Extensions page**
   - Open Chrome and go to `chrome://extensions`.

3. **Enable Developer mode**
   - Toggle **Developer mode** (top-right corner) to ON.

4. **Load the extension**
   - Click the **Load unpacked** button (top-left).
   - Select the `BountyWatch` folder that contains `manifest.json`.
   - BountyWatch appears in your extension list. It is now active.

5. **Pin the extension (optional but recommended)**
   - Click the puzzle piece icon in the Chrome toolbar.
   - Find **BountyWatch** and click the pin so the icon stays visible in your toolbar.

## How to use

### Basic tracking

- Just browse normally. When BountyWatch detects a page that is a bug bounty program, it adds it to your list automatically (look for the badge count on the extension icon).
- Click the **BountyWatch icon** to open the popup and see everything tracked.

### In the popup toolbar

- **Search** – filter the tracked programs by title or URL.
- **Copy** – copies all detected programs as a JSON array to your clipboard.
- **Chatgpt** – opens `chatgpt.com` in a new tab, attaches a `bountywatch-prompt.txt` file containing every tracked program plus the extraction instructions, and automatically presses send. Copy ChatGPT's ` ```json ``` ` output and you're done.
- **Clear** – empties your tracked list.

## Updating the extension

After pulling new code, reload it so the changes take effect (otherwise the extension may keep running the old version):

1. Go to `chrome://extensions`.
2. Click the **reload (⟳)** icon on the BountyWatch card.
3. Important: after any change to `manifest.json`, clicking reload re-registers content scripts. It is a good idea to refresh any already-open `chatgpt.com` tabs once so they get the latest script.

## Files

| File             | Purpose                                                            |
| ---------------- | ------------------------------------------------------------------ |
| `manifest.json`  | Extension manifest (Manifest V3) and content-script registration   |
| `background.js`  | Service worker: scanning, storage, badge, permission handling      |
| `common.js`      | Shared helpers (keywords, text extraction, URL normalization)      |
| `content.js`     | Content script that scans pages on your sites                      |
| `popup.html`     | Popup UI                                                            |
| `popup.css`      | Popup styling                                                       |
| `popup.js`       | Popup logic (search, copy, clear, Chatgpt)                          |
| `chatgpt-inject.js` | Content script for `chatgpt.com` – attaches the prompt file and submits |
| `icons/`         | Extension icons                                                     |

## Troubleshooting

- **Badge shows no count but I visited a program page** – make sure the page is really a bug bounty program (keywords must appear in page text). Reload the page after installing the extension; content scripts start on freshly loaded pages.
- **Chatgpt button seems to do nothing** – make sure you are logged into ChatGPT, and that no `chatgpt.com` tab is mid-upload when you click. Reload the extension, then reload any open `chatgpt.com` tab.
- **Changes not applying** – you must click **reload (⟳)** on `chrome://extensions` after editing files.

## License

Private / internal use. If you publish this extension in the Chrome Web Store, adjust the store-only permissions and review the policy guidelines first.
