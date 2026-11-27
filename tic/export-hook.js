// Find the studio's export command name in WASM memory and rename it.
// The command table is a C array of pointers. The help string is unique.
// The name pointer sits two pointers (8 bytes) before the help pointer.
// Renaming export -> exporx makes the console say "unknown command".
var ExportHook = (function () {
  var HELP = [69, 120, 112, 111, 114, 116, 32, 99, 97, 114, 116, 32, 116, 111, 32, 72, 84, 77, 76];
  var NAME = [101, 120, 112, 111, 114, 116];

  function findHelp(heap, from) {
    outer: for (var i = from; i + HELP.length <= heap.length; i++) {
      if (heap[i] !== HELP[0]) continue;
      for (var j = 1; j < HELP.length; j++) if (heap[i + j] !== HELP[j]) continue outer;
      return i;
    }
    return -1;
  }

  function nameSites(heap, words) {
    var sites = [];
    var from = 0;
    while (from < heap.length) {
      var at = findHelp(heap, from);
      if (at < 0) break;
      for (var w = 2; w < words.length; w++) {
        if (words[w] !== at) continue;
        var namePtr = words[w - 2];
        if (namePtr <= 0 || namePtr + 7 > heap.length) continue;
        var match = true;
        for (var k = 0; k < NAME.length; k++) {
          var byte = heap[namePtr + k];
          if (byte !== NAME[k] && !(k === 5 && byte === 120)) match = false;
        }
        if (match && heap[namePtr + 6] === 0) sites.push(namePtr);
      }
      from = at + HELP.length;
    }
    return sites;
  }

  function setExport(mod, disable) {
    var heap = mod && mod.HEAPU8;
    var words = mod && mod.HEAPU32;
    if (!heap || !words) return { ok: false, detail: "wasm heap is not exported" };
    var sites = nameSites(heap, words);
    if (!sites.length) return { ok: false, detail: "export command was not found in memory" };
    var letter = disable ? 120 : 116;
    for (var i = 0; i < sites.length; i++) heap[sites[i] + 5] = letter;
    return { ok: true, disabled: disable, sites: sites.length };
  }

  return { nameSites: nameSites, setExport: setExport };
})();
