function createCodeFromName(name, parentCode = "") {
  return `${name.toLowerCase().replace(/\s/g, "")}:${parentCode}`;
}

module.exports = { createCodeFromName };
