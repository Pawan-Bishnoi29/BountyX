(() => {
  const PENDING_PROMPT_KEY = "BOUNTYWATCH_PENDING_PROMPT";
  const MSG_SEND_TO_CHATGPT = "BOUNTYWATCH_SEND_TO_CHATGPT";

  async function takePendingPrompt() {
    const data = await chrome.storage.local.get(PENDING_PROMPT_KEY);
    const prompt = data[PENDING_PROMPT_KEY];
    if (prompt) await chrome.storage.local.remove(PENDING_PROMPT_KEY);
    return typeof prompt === "string" ? prompt : "";
  }

  function findComposer() {
    return document.querySelector(
      '[contenteditable="true"].ProseMirror[role="textbox"]'
    );
  }

  function findFileInput() {
    const inputs = document.querySelectorAll('input[type="file"]');
    for (const el of inputs) {
      const accept = el.getAttribute("accept") || "";
      if (!/image|video/i.test(accept)) return el;
    }
    return inputs[0] || null;
  }

  function findSendButton() {
    const selectors = [
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[type="submit"]',
      'button[aria-label="Send message"]',
      'button[aria-label="Send"]'
    ];
    for (const sel of selectors) {
      const btn = document.querySelector(sel);
      if (btn) return btn;
    }
    return null;
  }

  function buttonReady(btn) {
    return !btn.disabled && btn.getAttribute("aria-disabled") !== "true";
  }

  function attachmentVisible() {
    const composerBody = document.querySelector('[data-composer-body]');
    if (!composerBody) return false;
    return /bountywatch-prompt/i.test(composerBody.textContent || "");
  }

  function attachmentGone() {
    return !attachmentVisible();
  }

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function attachFile(prompt) {
    const input = findFileInput();
    if (!input) return false;

    const file = new File([prompt], "bountywatch-prompt.txt", {
      type: "text/plain"
    });
    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.dispatchEvent(new Event("input", { bubbles: true }));

    let chipCounted = false;
    for (let i = 0; i < 30; i++) {
      if (attachmentVisible()) {
        chipCounted = true;
        break;
      }
      await sleep(500);
    }
    if (!chipCounted) return false;

    let readyStreak = 0;
    for (let i = 0; i < 60; i++) {
      await sleep(500);
      const btn = findSendButton();
      if (btn && buttonReady(btn) && attachmentVisible()) {
        readyStreak++;
        if (readyStreak >= 2) {
          btn.click();
          for (let j = 0; j < 8; j++) {
            await sleep(500);
            if (!btn.isConnected || !buttonReady(btn) || attachmentGone()) {
              return true;
            }
          }
          return true;
        }
      } else {
        readyStreak = 0;
      }
    }
    return false;
  }

  function setComposerText(editor, text) {
    editor.focus();
    if (document.execCommand("insertText", false, text)) return;
    const p = editor.querySelector("p");
    if (p) {
      p.textContent = text;
      editor.dispatchEvent(new InputEvent("input", { bubbles: true }));
    }
  }

  async function sendAsText(prompt) {
    const editor = findComposer();
    if (!editor) return;
    setComposerText(editor, prompt);
    for (let i = 0; i < 40; i++) {
      const btn = findSendButton();
      if (btn && buttonReady(btn)) {
        btn.click();
        for (let j = 0; j < 6; j++) {
          await sleep(500);
          if (editor.textContent === "") return;
        }
        return;
      }
      await sleep(250);
    }
  }

  async function send(prompt) {
    if (!prompt) return;
    await sleep(4000);

    for (let i = 0; i < 20; i++) {
      if (findComposer() || findFileInput()) break;
      await sleep(500);
    }

    const attached = await attachFile(prompt);
    if (!attached) await sendAsText(prompt);
  }

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg && msg.type === MSG_SEND_TO_CHATGPT) {
      takePendingPrompt()
        .then(send)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }
    return false;
  });

  window.addEventListener("load", () => {
    setTimeout(() => takePendingPrompt().then(send), 500);
  });
})();