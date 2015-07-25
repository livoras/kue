var config = require("./config")
var _ = require("./util")
var exports = {}

exports.getExps = function(text) {
  var EXP_REG = new RegExp("\\" + config.prefix + "[\\S\\s]+?" + "\\" + config.suffix, 'g')
  var REMOVE_REG = new RegExp("\\" + config.prefix + "|" + "\\" + config.suffix, 'g')
  var results = text.match(EXP_REG)
  if (!results) return []
  var exps = []
  _.each(results, function(rawExp) {
    exps.push(rawExp.replace(REMOVE_REG, ""))
  })
  return exps
}

module.exports = exports