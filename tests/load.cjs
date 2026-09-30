const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
module.exports = (name) =>
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../public/lilt', name), 'utf8'), {
    filename: name,
  });
