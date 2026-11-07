import json

# Restatements
with open(r'D:\ShirAmiram\data\imports\amiram_restatements.json', encoding='utf-8') as f:
    restatements = json.load(f)

with open(r'D:\ShirAmiram\src\amiram_restatements_data.js', 'w', encoding='utf-8') as f:
    f.write('// Synchronous Amiram Restatements Bundle (30 questions)\n')
    f.write('(function(root) {\n')
    f.write('  var data = ' + json.dumps(restatements, ensure_ascii=False) + ';\n')
    f.write('  if (typeof module !== "undefined" && module.exports) { module.exports = data; }\n')
    f.write('  else { root.AMIRAM_RESTATEMENTS_DATA = data; }\n')
    f.write('})(typeof self !== "undefined" ? self : this);\n')

# Reading Passages
with open(r'D:\ShirAmiram\data\imports\amiram_reading_passages.json', encoding='utf-8') as f:
    passages = json.load(f)

with open(r'D:\ShirAmiram\src\amiram_reading_data.js', 'w', encoding='utf-8') as f:
    f.write('// Synchronous Amiram Reading Passages Bundle (3 passages, 15 questions)\n')
    f.write('(function(root) {\n')
    f.write('  var data = ' + json.dumps(passages, ensure_ascii=False) + ';\n')
    f.write('  if (typeof module !== "undefined" && module.exports) { module.exports = data; }\n')
    f.write('  else { root.AMIRAM_READING_DATA = data; }\n')
    f.write('})(typeof self !== "undefined" ? self : this);\n')

print("Generated src/amiram_restatements_data.js and src/amiram_reading_data.js successfully.")
