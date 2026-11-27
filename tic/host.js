// Boots one studio page. Player mode fetches dawn.tic from a blob URL
// the shell stored. Studio mode seats ye.tic and loads it.
var Module = {
  canvas: document.getElementById("canvas"),
  locateFile: function (path) {
    return "../vendor/tic80/" + path;
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
  if (!existed) {
    if (!starter) {
      post({ type: "error", text: "the starter cart was not ready" });
      return;
    }
    fs.writeFile(path, starter);
  }
  post({ type: "folder", dir: root, seeded: !existed });
  readCarts(existed ? "seated" : "seeded");
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
    document.getElementById("canvas").focus();
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
      var response = await fetch("../carts/ye.tic");
      if (!response.ok) throw new Error("starter cart HTTP " + response.status);
      starter = new Uint8Array(await response.arrayBuffer());
      Module.arguments = ["--skip", "--cmd=load ye.tic"];
    }
    var script = document.createElement("script");
    script.src = "../vendor/tic80/tic80.js";
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
