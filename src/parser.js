var config = require("./config")
var _ = require("./util")
var exports = {}

var EXP_REG = new RegExp("\\" + config.openTag + "[\\S\\s]+?" + "\\" + config.closeTag, 'g')
var REMOVE_REG = new RegExp("\\" + config.openTag + "|" + "\\" + config.closeTag, 'g')

exports.getRawExps = function(text) {
  var results = text.match(EXP_REG) || []
  return results
}

exports.getExpFromRawExp = function(rawExp) {
  return rawExp.replace(REMOVE_REG, "")
}

/** 
 * Steal from Vue.js: 
 * https://github.com/yyx990803/vue/blob/dev/src/parsers/expression.js
 */
var KEYWORD_REG = /[_\w][_$\w\d]+/g
var ignoreKeywords =
  'Math,Date,this,true,false,null,undefined,Infinity,NaN,' +
  'isNaN,isFinite,decodeURI,decodeURIComponent,encodeURI,' +
  'encodeURIComponent,parseInt,parseFloat'
var IGNORE_KEYWORDS_REG = 
  new RegExp('^(' + ignoreKeywords.replace(/,/g, '\\b|') + '\\b)')

/**
 * Parse text and return expressions.
 * @return {Array<Object>}
 *               - rawExp {String}         e.g "{firstName() + lastName()}"
 *               - exp {String}            e.g "firstName() + lastName()"
 *               - tokens {Array<String>}  e.g ["firstName", "lastName"]
 */
exports.parse = function(text) {
  var rawExps = exports.getRawExps(text)
  var expressions = []
  _.each(rawExps, function(rawExp) {
    var exp = exports.getExpFromRawExp(rawExp)
    var candidates = exp.match(KEYWORD_REG) || []
    var tokens = []
    _.each(candidates, function(candidate) {
      if (IGNORE_KEYWORDS_REG.test(candidate)) return
      tokens.push(candidate)
    })
    var expression = {
      rawExp: rawExp,
      exp: exp,
      tokens:tokens 
    }
    expressions.push(expression)
  })
  return expressions 
}

exports.exec = function(expression, vm) {
  var args = []
  var tokens = expression.tokens
  _.each(tokens, function(token) {
    args.push(vm[token])
  })
  var exp = "return " + expression.exp + ";"
  return (new Function(tokens, exp)).apply(vm, args)
}

module.exports = exports