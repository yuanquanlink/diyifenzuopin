// Boots one studio page. Player mode fetches dawn.tic from a blob URL
// the shell stored. Studio mode seats ye.tic and loads it.
var Module = {
  canvas: document.getElementById("canvas"),
  locateFile: function (path) {
    return new URL("../vendor/tic80/" + path, location.href).href;
  },
  arguments: [],
  print: function (text) {
    post({ type: "print", text: String(text) });
  },
  printErr: function (text) {
    post({ type: "print", text: String(text) });
  },
};

var mode = new URLSearchParams(location.search).get("mode") || "studio";
var starter = null;

function post(message) {
  parent.postMessage(message, "*");
}

var canvas = document.getElementById("canvas");

function keysHere() {
  return document.hasFocus();
}

function claimKeys() {
  window.focus();
  canvas.focus();
  post({ type: "focus-state", on: keysHere() });
}

function reportKeys() {
  post({ type: "focus-state", on: keysHere() });
}

document.addEventListener("pointerdown", function () {
  claimKeys();
}, true);
window.addEventListener("focus", reportKeys);
window.addEventListener("blur", function () {
  post({ type: "focus-state", on: false });
});
setInterval(function () {
  if (!keysHere()) return;
  var modal = document.getElementById("add-modal");
  if (modal && modal.style.display === "block") return;
  if (document.activeElement !== canvas) canvas.focus();
}, 300);

Module.saveAs = function (blob, name) {
  post({ type: "download", name: String(name || "download"), size: blob.size || 0 });
  var url = URL.createObjectURL(blob);
  var link = document.createElement("a");
  link.href = url;
  link.download = name || "download";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () {
    URL.revokeObjectURL(url);
  }, 4000);
};

function installDawnFetch(blobUrl) {
  var orig = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = typeof input === "string" ? input : (input && input.url) || "";
    if (String(url).indexOf("dawn.tic") !== -1) return orig(blobUrl);
    return orig(input, init);
  };
}

function readCarts(reason) {
  var fs = Module.FS;
  if (!fs) return;
  var root = "/com.nesbox.tic/TIC-80/";
  var names = [];
  try {
    names = fs.readdir(root);
  } catch (err) {
    post({ type: "error", text: "cannot read the machine folder: " + err });
    return;
  }
  var files = [];
  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    if (name.length < 5 || name.slice(-4) !== ".tic") continue;
    var path = root + name;
    try {
      var st = fs.stat(path);
      var data = fs.readFile(path);
      var copy = new Uint8Array(data.byteLength);
      copy.set(data);
      var mtime = st.mtime instanceof Date ? st.mtime.getTime() : Number(st.mtime) || 0;
      files.push({ name: name, bytes: copy.byteLength, mtime: mtime, data: copy });
    } catch (err) {
      post({ type: "error", text: "cannot read " + name + ": " + err });
    }
  }
  post({ type: "carts", reason: reason, files: files });
}

Module.onRuntimeInitialized = function () {
  // Chapter 1 does not rename console commands. The torn page is the
  // movement words in the manual, not a patched command table.
  post({ type: "runtime" });
};

Module.onFolderReady = function (dir) {
  if (mode !== "studio") return;
  var fs = Module.FS;
  var root = dir.charAt(dir.length - 1) === "/" ? dir : dir + "/";
  var path = root + "ye.tic";
  var existed = true;
  try {
    fs.stat(path);
  } catch (err) {
    existed = false;
  }
  if (!starter) {
    post({ type: "error", text: "the starter cart was not ready" });
    return;
  }
  if (!existed) {
    fs.writeFile(path, starter);
  } else {
    var seated = fs.readFile(path);
    var fresher = freshenCart(seated instanceof Uint8Array ? seated : new Uint8Array(seated), starter);
    if (fresher) fs.writeFile(path, fresher);
  }
  post({ type: "folder", dir: root, seeded: !existed });
  readCarts(existed ? "seated" : "seeded");
}

function chunkWord(type, bank, size) {
  return (type & 31) | ((bank & 7) << 5) | ((size & 0xffff) << 8);
}

function readChunks(cart) {
  var out = [];
  var ptr = 0;
  while (ptr + 4 <= cart.length) {
    var word = cart[ptr] | (cart[ptr + 1] << 8) | (cart[ptr + 2] << 16) | (cart[ptr + 3] << 24);
    var type = word & 31;
    var bank = (word >>> 5) & 7;
    var size = (word >>> 8) & 0xffff;
    ptr += 4;
    if (ptr + size > cart.length) break;
    out.push({ type: type, bank: bank, data: cart.slice(ptr, ptr + size) });
    ptr += size;
  }
  return out;
}

function writeChunks(chunks) {
  var total = 0;
  chunks.forEach(function (chunk) { total += 4 + chunk.data.length; });
  var out = new Uint8Array(total);
  var at = 0;
  chunks.forEach(function (chunk) {
    var word = chunkWord(chunk.type, chunk.bank, chunk.data.length);
    out[at] = word & 255;
    out[at + 1] = (word >>> 8) & 255;
    out[at + 2] = (word >>> 16) & 255;
    out[at + 3] = (word >>> 24) & 255;
    out.set(chunk.data, at + 4);
    at += 4 + chunk.data.length;
  });
  return out;
}

function codeText(cart) {
  var parts = [];
  readChunks(cart).forEach(function (chunk) {
    if (chunk.type === 5) parts.push(chunk.data);
  });
  var total = parts.reduce(function (n, part) { return n + part.length; }, 0);
  var joined = new Uint8Array(total);
  var at = 0;
  parts.forEach(function (part) {
    joined.set(part, at);
    at += part.length;
  });
  return new TextDecoder().decode(joined);
}

function freshenCart(existing, fresh) {
  var code = codeText(existing);
  var purple = /cls\s*\(\s*flash\s+and\s+1/.test(code);
  var slow = /p[xy]=p[xy][+-]1/.test(code);
  if (!purple && !slow) return null;
  var guessed = /\bbtn\s*\(/.test(code) || /\bbtnp\s*\(/.test(code);
  if (!guessed) return fresh;
  var next = code
    .replace(/cls\s*\(\s*flash\s+and\s+1\s+or\s+0\s*\)/g, "cls(0)")
    .replace(/px=px-1/g, "px=px-3")
    .replace(/px=px\+1/g, "px=px+3")
    .replace(/py=py-1/g, "py=py-3")
    .replace(/py=py\+1/g, "py=py+3");
  if (next === code) return null;
  var kept = readChunks(existing).filter(function (chunk) { return chunk.type !== 5; });
  kept.push({ type: 5, bank: 0, data: new TextEncoder().encode(next) });
  return writeChunks(kept);
};

Module.onFsFlush = function () {
  if (mode === "studio") readCarts("flush");
};

Module.onCartReady = function () {
  post({ type: "cart-ready" });
};

Module.onCartError = function () {
  post({ type: "error", text: "the player could not fetch the dawn cart" });
};

function keyEvent(type, key, code, keyCode) {
  var event = new KeyboardEvent(type, {
    key: key,
    code: code,
    bubbles: true,
    cancelable: true,
  });
  try {
    Object.defineProperty(event, "keyCode", { get: function () { return keyCode; } });
    Object.defineProperty(event, "which", { get: function () { return keyCode; } });
    Object.defineProperty(event, "charCode", { get: function () { return type === "keypress" ? keyCode : 0; } });
  } catch (err) {
    /* some browsers keep a keyCode of 0 on synthetic events */
  }
  return event;
}

function wait(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

async function pressKeys(text) {
  var canvas = document.getElementById("canvas");
  window.focus();
  canvas.focus();
  for (var i = 0; i < text.length; i++) {
    var ch = text.charAt(i);
    var enter = ch === "\n";
    var key = enter ? "Enter" : ch;
    var code = enter ? "Enter" : "Key" + ch.toUpperCase();
    var keyCode = enter ? 13 : ch.charCodeAt(0);
    if (enter) {
      await wait(180);
      canvas.dispatchEvent(keyEvent("keydown", key, code, keyCode));
      await wait(180);
      canvas.dispatchEvent(keyEvent("keyup", key, code, keyCode));
    } else {
      canvas.dispatchEvent(keyEvent("keypress", key, code, keyCode));
    }
  }
}

window.addEventListener("message", function (event) {
  if (event.source !== parent) return;
  var data = event.data || {};
  if (data.type === "export") {
    var result = ExportHook.setExport(Module, !data.enabled);
    post({
      type: "export-hook",
      ok: result.ok,
      disabled: !!result.disabled,
      sites: result.sites || 0,
      detail: result.detail || "",
    });
  } else if (data.type === "keys") {
    var typed = String(data.text || "");
    setTimeout(function () {
      pressKeys(typed).catch(function (err) {
        post({ type: "error", text: "keys failed: " + err });
      });
    }, 30);
  } else if (data.type === "focus") {
    claimKeys();
  }
});

window.addEventListener("error", function (event) {
  post({ type: "error", text: event.message || "the machine threw" });
});

async function boot() {
  try {
    if (mode === "player") {
      var blobUrl = sessionStorage.getItem("diyi-dawn-url");
      if (!blobUrl) throw new Error("no dawn cart was handed to the player");
      installDawnFetch(blobUrl);
      Module.arguments = ["dawn.tic", "--skip"];
    } else {
      var response = await fetch(new URL("../carts/ye.tic", location.href).href);
      if (!response.ok) throw new Error("starter cart HTTP " + response.status);
      starter = new Uint8Array(await response.arrayBuffer());
      Module.arguments = ["--skip", "--cmd=load ye.tic"];
    }
    var script = document.createElement("script");
    script.src = new URL("../vendor/tic80/tic80.js", location.href).href;
    script.async = false;
    script.onerror = function () {
      post({ type: "error", text: "tic80.js did not load" });
    };
    document.body.appendChild(script);
  } catch (err) {
    post({ type: "error", text: String(err && err.message ? err.message : err) });
  }
}

boot();
