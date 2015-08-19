var config = require("./config")
var _ = require("./util")
var objectPath = require("./object-path")

var SPECIAL_CHARS = /(\*\.\?\+\$\^\[\]\(\)\{\}\|\\\/)/g
var openTag, closeTag, EXP_REG, REMOVE_REG

function makeREG() {
  openTag = config.openTag.replace(SPECIAL_CHARS, "\\$1")
  closeTag = config.closeTag.replace(SPECIAL_CHARS, "\\$1")

  EXP_REG = new RegExp(openTag + "[\\S\\s]+?" + closeTag, 'g')
  REMOVE_REG = new RegExp(openTag + "|" + closeTag, 'g')
}

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
var PATH_REG = /[_\w\$][_\$\w\d\.\[\]]+/g
var ignoreKeywords =
  'Math,Date,this,true,false,null,undefined,Infinity,NaN,' +
  'isNaN,isFinite,decodeURI,decodeURIComponent,encodeURI,' +
  'encodeURIComponent,parseInt,parseFloat,in,JSON'
var IGNORE_KEYWORDS_REG =
  new RegExp('^(' + ignoreKeywords.replace(/,/g, '\\b|') + '\\b)')

/**
 * Parse text and return expressions.
 * @param {String} text
 * @return {Array<Object>}
 *               - rawExp {String}         e.g "{firstName() + lastName()}"
 *               - exp {String}            e.g "firstName() + lastName()"
 *               - tokens {Array<String>}  e.g ["firstName", "lastName"]
 */
exports.parse = function(text) {
  makeREG()
  var rawExps = exports.getRawExps(text)
  var expressions = []
  _.each(rawExps, function(rawExp) {
    var exp = exports.getExpFromRawExp(rawExp)
    var tokensAndPaths = exports.parseTokensAndPaths(exp)
    var expression = {
      rawExp: rawExp,
      exp: exp,
      tokens: tokensAndPaths.tokens,
      paths: tokensAndPaths.paths
    }
    expressions.push(expression)
  })
  return expressions
}

exports.parseTokensAndPaths = function(exp) {
  // TODO: To optimze this regular expression to avoid this case:
  // "'I\'m ' + name()"
  var STRING_REG = /('[\s\S]*?')|("[\s\S]*?")/g
  exp = exp.replace(STRING_REG, '')
  var pathsCandidates = exp.match(PATH_REG) || []
  var tokensMap = {}
  var pathMap = {}
  var tokens = []
  var paths = []
  _.each(pathsCandidates, function(path) {
    token = objectPath.getFirstProp(path)
    if (IGNORE_KEYWORDS_REG.test(token)) return
    tokensMap[token] = 1
    pathMap[path] = 1
  })
  for(var token in tokensMap) {
    tokens.push(token)
  }
  for(var rawPath in pathMap) {
    paths.push(objectPath.makePathFromRawPath(rawPath))
  }
  return {
    tokens: tokens,
    paths: paths
  }
}


exports.exec = function(expression, scope) {
  var args = []
  var tokens = expression.tokens
  _.each(tokens, function(token) {
    args.push(scope.get(token))
  })
  var exp = "return " + expression.exp + ";"
  return (new Function(tokens, exp)).apply(scope, args)
}

exports.parseDirective = function(value) {
  var STRING_DIR_REG = /^[_$\w][_$\w\d\s\(\)\.\[\]]*$/
  var value = _.trim(value)
  if (value.length === 0 || STRING_DIR_REG.test(value)) {
    //return value
    return objectPath.makePathFromRawPath(value)
  } else {
    var ret = {}
    _.each(value.split(","), function(map) {
      var kv = map.split(":")
      var key = cleanQuotes(_.trim(kv[0]))
      var value = _.trim(kv[1])
      ret[key] = value
    })
    return ret
  }
}

function cleanQuotes(str) {
  var QUOTE_REG = /["']/g
  return str.replace(QUOTE_REG, "")
}
makeREG()
