import json

with open(r'D:\ShirAmiram\data\imports\amiram_vocab_full.json', encoding='utf-8') as f:
    data = json.load(f)

with open(r'D:\ShirAmiram\src\amiram_vocab_data.js', 'w', encoding='utf-8') as f:
    f.write('// Synchronous Amiram Vocabulary Bundle (300 words)\n')
    f.write('(function(root) {\n')
    f.write('  var data = ' + json.dumps(data, ensure_ascii=False) + ';\n')
    f.write('  if (typeof module !== "undefined" && module.exports) { module.exports = data; }\n')
    f.write('  else { root.AMIRAM_VOCAB_DATA = data; }\n')
    f.write('})(typeof self !== "undefined" ? self : this);\n')

print(f"Generated src/amiram_vocab_data.js with {len(data)} words.")
