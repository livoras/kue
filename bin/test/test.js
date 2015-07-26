(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var config = require("./config")
var _ = require("./util")
var parser = require("./parser")
var directives = require("./directives")

exports.bindText = function(textNode, kue) {
  var vm = kue.vm
  var text = textNode.textContent || textNode.nodeValue // fuck IE7, 8
  var expressions = parser.parse(text)
  function writeResult() {
    var textTpl = text
    _.each(expressions, function(expression) {
      var result = parser.exec(expression, vm)
      textTpl = textTpl.replace(expression.rawExp, result)
    })
    if (textNode.nodeValue) {
      textNode.nodeValue = textTpl
    } else {
      textNode.textNode = textTpl
    }
  }
  writeResult()
  watchAllTokens(expressions, kue, writeResult)
}

function watchAllTokens(expressions, kue, fn) {
  var vm = kue.vm
  _.each(expressions, function(expression) {
    _.each(expression.tokens, function(token) {
      watchToken(token)
    })
  })

  function watchToken(token) {
    var obserableKey = vm[token]
    if (_.isUndefined(obserableKey)) return
    if (_.isObserable(obserableKey)) {
      obserableKey.$$.watch(fn)
    }
  }
}

exports.bindDir = function(attr, node, kue) {
  var dirName = getDirName(attr)
  if(!dirName) return
  if(!directives[dirName]) {
    throw new Error("Directive" + dirName + " is not found.")
  }
  var directive = parser.parseDirective(attr.value)
  var tokens = getTokensFromDirective(directive)
  var dirObj = directives[dirName]
  dirObj.bind(node, attr, kue)
  _.each(tokens, function(token) {
    kue.vm[token].$$.watch(function(newVal, oldVal, obserable) {
      dirObj.update(node, attr, kue)
    })
  })
}

function getTokensFromDirective(directive) {
  if (_.isString(directive)) {
    return parser.parseTokens(directive)
  } else {
    var allTokens = []
    for (key in directive) {
      var tokens = parser.parseTokens(directive[key])
      allTokens.push.apply(allTokens, tokens)
    }
    return allTokens
  }
}

function getDirName(attr) {
  var DIR_REG = new RegExp(("^" + config.directivePrefix + "-" + "([\\w\\d]+)"))
  var results = attr.name.match(DIR_REG)
  if(results) {
    return results[1]
  }
  return void 666
}

exports.getTokensFromDirective = getTokensFromDirective
},{"./config":2,"./directives":3,"./parser":6,"./util":7}],2:[function(require,module,exports){
var config = exports

config.openTag = "{"
config.closeTag = "}"
config.directivePrefix = "k"

},{}],3:[function(require,module,exports){
var $ = require("../dom")

exports["show"] = {
  bind: function(ele, attr, kue) {
    this.update(ele, attr, kue)
  },
  update: function(ele, attr, kue) {
    $(ele).css("display", kue.vm[attr.value]() ? "block": "none")
  }
}

},{"../dom":4}],4:[function(require,module,exports){
var $ = function(dom) {
  return {
    el: dom,
    attr: function(attr, name) {
      if (arguments.length === 1) {
        return this.el.getAttribute(attr)
      } else {
        this.el.setAttribute(attr, name)
      }
    },
    css: function(key, value) {
      if (arguments.length === 1) {
        this.el.style[key]
      } else {
        this.el.style[key] = value
      }
    }
  }
}

module.exports = $
},{}],5:[function(require,module,exports){
var _ = require("./util.js")

function ObserableKey(attr) {
  var that = this
  this.value = attr
  this.watchers = []
  function getOrSet(attr) {
    if (arguments.length === 0) {
      return that.value
    }
    that.oldValue = this.value
    that.value = attr
    that.notify()
  }
  getOrSet.$$ = that
  return getOrSet
}

ObserableKey.prototype.notify = function() {
  var that = this
  _.each(this.watchers, function(watcher) {
    watcher(that.value, that.oldValue, that)
  })
}

ObserableKey.prototype.watch = function(fn) {
  this.watchers.push(fn)
}

function ObserableArray(arr) {
  
}

function obserable(obj) {
  if (!_.isArray(obj)) {
    return new ObserableKey(obj)
  } else {
    return new ObserableArray(obj)
  }
}

obserable.ObserableKey = ObserableKey
obserable.ObserableArray = ObserableArray

module.exports = obserable

},{"./util.js":7}],6:[function(require,module,exports){
var config = require("./config")
var _ = require("./util")

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
var KEYWORD_REG = /[_\w][_$\w\d]+/g
var ignoreKeywords =
  'Math,Date,this,true,false,null,undefined,Infinity,NaN,' +
  'isNaN,isFinite,decodeURI,decodeURIComponent,encodeURI,' +
  'encodeURIComponent,parseInt,parseFloat,in'
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
    var expression = {
      rawExp: rawExp,
      exp: exp,
      tokens: exports.parseTokens(exp) 
    }
    expressions.push(expression)
  })
  return expressions 
}

exports.parseTokens = function(exp) {
  // TODO: To optimze this regular expression to avoid this case:
  // "'I\'m ' + name()"
  var STRING_REG = /('[\s\S]*?')|("[\s\S]*?")/g
  exp = exp.replace(STRING_REG, '')
  var candidates = exp.match(KEYWORD_REG) || []
  var tokensMap = {}
  var tokens = []
  _.each(candidates, function(candidate) {
    if (IGNORE_KEYWORDS_REG.test(candidate)) return
    tokensMap[candidate] = 1
  })
  for(var key in tokensMap) {
    tokens.push(key)
  }
  return tokens
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

exports.parseDirective = function(value) {
  var STRING_DIR_REG = /^[_$\w][_$\w\d\s]*$/
  var value = _.trim(value)
  if (value.length === 0 || STRING_DIR_REG.test(value)) {
    return value
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
},{"./config":2,"./util":7}],7:[function(require,module,exports){
var obserable = require("./obserable")

exports.isObserable = function(obj) {
  var obj = obj.$$
  return (obj instanceof obserable.ObserableKey) ||
         (obj instanceof obserable.ObserableArray)
}

exports.map = function(arr, fn) {
  var results = []
  for(var i = 0, len = arr.length; i < len;i ++) {
    results.push(fn(arr[i]))
  }
  return results
}

exports.isArray = function(arr) {
  return Object.prototype.toString.call(arr) === '[object Array]'
}

exports.each = function(arr, fn) {
  for (var i = 0, len = arr.length; i < len; i++) {
    fn(arr[i])
  }
}

exports.isUndefined = function(obj) {
  return obj === void 666;
}

exports.trim = function(str) {
  return str.replace(/(^\s+)|\s+$/g, "")
}

/**
 * Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
 * steal from underscore: http://underscorejs.org/docs/underscore.html
 */
exports.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
  exports['is' + name] = function(obj) {
    return Object.prototype.toString.call(obj) === '[object ' + name + ']';
  };
});

},{"./obserable":5}],8:[function(require,module,exports){
//require("./specs/sample.js")
require("./specs/util.js")
require("./specs/obserable.js")
require("./specs/parser.js")
require("./specs/binder.js")

},{"./specs/binder.js":9,"./specs/obserable.js":10,"./specs/parser.js":11,"./specs/util.js":12}],9:[function(require,module,exports){
var binder = require("../../src/binder")

describe("Test binder", function() {
  it("Get tokens from different directive", function() {
    binder.getTokensFromDirective("token in tokens")
        .should.be.deep.equal(["token", "tokens"])
    binder.getTokensFromDirective({
          "color": "'red'",
          "'font-size'": "size() + 'px'",
          "name": "jerry()",
          "width": "width() + 'px'"
        }).should.be.deep.equal(["size", "jerry", "width"])
  })
})
},{"../../src/binder":1}],10:[function(require,module,exports){
var obserable = require("../../src/obserable.js")

describe("Test obserable", function() {
  describe("Test obserable string attribute", function() {
    var attr = null;

    before(function() {
      attr = obserable("i love you")
    })

    it("Initializing default value and get it.", function() {
      attr().should.be.equal("i love you")
    })

    it("Watcher function should be invoked when value is changed.", function() {
      var watcher = sinon.spy()
      attr.$$.watch(watcher)
      var val = "i love you, too"
      attr(val)
      watcher.should.have.been.calledWith(val, void 666, attr.$$)
      watcher.should.have.been.calledOnce
      attr().should.be.equal("i love you, too")
    })

  })
})
},{"../../src/obserable.js":5}],11:[function(require,module,exports){
var parser = require("../../src/parser")
var config = require("../../src/config")

describe("Test parser", function() {

  it("Get raw expressions from text.", function() {
    parser.getRawExps("{firstName + lastName} is my {name}")
          .should.be.deep.equal(["{firstName + lastName}", "{name}"])
  })

  it("Get expression objects from text.", function() {
    parser.parse("{name() === true ? good() + 'ye': bad()}")
          .should.be.deep.equal([{
            rawExp: "{name() === true ? good() + 'ye': bad()}",
            exp: "name() === true ? good() + 'ye': bad()",
            tokens: ["name", "good", "bad"]
          }])
    parser.parse('{name() + "Good\' name is my love"}')
          .should.be.deep.equal([{
            rawExp: '{name() + "Good\' name is my love"}',
            exp: 'name() + "Good\' name is my love"',
            tokens: ["name"]
          }])
    parser.parse("Today totalCount is {parseFloat(totalCount()) + 'Hello'}, {name} should make it.")
          .should.be.deep.equal([{
            rawExp: "{parseFloat(totalCount()) + 'Hello'}",
            exp: "parseFloat(totalCount()) + 'Hello'",
            tokens: ["totalCount"]
          }, {
            rawExp: "{name}",
            exp: "name",
            tokens: ["name"]
          }])
  })

  it("Execute an expression.", function() {
    parser.exec({
      exp: "this.lucy + name() + 1",
      tokens: ["name"]
    }, {
      name: function() {
        return "Jerry!"
      },
      lucy: "good"
    }).should.be.equal("goodJerry!1")
  })

  it("Parse with custom open and close tag.", function() {
    config.openTag = "{{"
    config.closeTag = "}}"
    parser.parse("{{name() === true ? good(): bad()}}")
          .should.be.deep.equal([{
            rawExp: "{{name() === true ? good(): bad()}}",
            exp: "name() === true ? good(): bad()",
            tokens: ["name", "good", "bad"]
          }])
  })

  it("Parse string directive.", function() {
    parser.parseDirective("users").should.be.equal("users")
    parser.parseDirective("user in users").should.be.equal("user in users")
  })

  it("Parse key-value directive.", function() {
    parser.parseDirective("color: red, 'font-size': '12px'")
          .should.be.deep.equal({
            "color": "red",
            "font-size": "'12px'"
          })
  })

  it("Pase only one time", function() {
    parser.parseTokens("name + name + name + jerry").should.be.deep.equal(["name", "jerry"])
  })
})
},{"../../src/config":2,"../../src/parser":6}],12:[function(require,module,exports){
_ = require("../../src/util.js")

describe("Test utils functions", function() {
  it("map", function() {
    var arr = [1, 2, 3, 4]
    var newArr = _.map(arr, function(val) {
      return val * 2
    })
    for(var i = 0, len = arr.length; i < len; i++) {
      arr[i] = arr[i] * 2
    }
    arr.should.be.deep.equal(newArr)
  })
  it("trim", function() {
    _.trim(" i love you    ").should.be.equal("i love you")
  })
})
},{"../../src/util.js":7}]},{},[8])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL2JpbmRlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvY29uZmlnLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9kaXJlY3RpdmVzL2luZGV4LmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9kb20uanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL29ic2VyYWJsZS5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvcGFyc2VyLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy91dGlsLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3Rlc3QvZmFrZV84N2QwNTJmOC5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L3NwZWNzL2JpbmRlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L3NwZWNzL29ic2VyYWJsZS5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L3NwZWNzL3BhcnNlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L3NwZWNzL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDVkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBjb25maWcgPSByZXF1aXJlKFwiLi9jb25maWdcIilcbnZhciBfID0gcmVxdWlyZShcIi4vdXRpbFwiKVxudmFyIHBhcnNlciA9IHJlcXVpcmUoXCIuL3BhcnNlclwiKVxudmFyIGRpcmVjdGl2ZXMgPSByZXF1aXJlKFwiLi9kaXJlY3RpdmVzXCIpXG5cbmV4cG9ydHMuYmluZFRleHQgPSBmdW5jdGlvbih0ZXh0Tm9kZSwga3VlKSB7XG4gIHZhciB2bSA9IGt1ZS52bVxuICB2YXIgdGV4dCA9IHRleHROb2RlLnRleHRDb250ZW50IHx8IHRleHROb2RlLm5vZGVWYWx1ZSAvLyBmdWNrIElFNywgOFxuICB2YXIgZXhwcmVzc2lvbnMgPSBwYXJzZXIucGFyc2UodGV4dClcbiAgZnVuY3Rpb24gd3JpdGVSZXN1bHQoKSB7XG4gICAgdmFyIHRleHRUcGwgPSB0ZXh0XG4gICAgXy5lYWNoKGV4cHJlc3Npb25zLCBmdW5jdGlvbihleHByZXNzaW9uKSB7XG4gICAgICB2YXIgcmVzdWx0ID0gcGFyc2VyLmV4ZWMoZXhwcmVzc2lvbiwgdm0pXG4gICAgICB0ZXh0VHBsID0gdGV4dFRwbC5yZXBsYWNlKGV4cHJlc3Npb24ucmF3RXhwLCByZXN1bHQpXG4gICAgfSlcbiAgICBpZiAodGV4dE5vZGUubm9kZVZhbHVlKSB7XG4gICAgICB0ZXh0Tm9kZS5ub2RlVmFsdWUgPSB0ZXh0VHBsXG4gICAgfSBlbHNlIHtcbiAgICAgIHRleHROb2RlLnRleHROb2RlID0gdGV4dFRwbFxuICAgIH1cbiAgfVxuICB3cml0ZVJlc3VsdCgpXG4gIHdhdGNoQWxsVG9rZW5zKGV4cHJlc3Npb25zLCBrdWUsIHdyaXRlUmVzdWx0KVxufVxuXG5mdW5jdGlvbiB3YXRjaEFsbFRva2VucyhleHByZXNzaW9ucywga3VlLCBmbikge1xuICB2YXIgdm0gPSBrdWUudm1cbiAgXy5lYWNoKGV4cHJlc3Npb25zLCBmdW5jdGlvbihleHByZXNzaW9uKSB7XG4gICAgXy5lYWNoKGV4cHJlc3Npb24udG9rZW5zLCBmdW5jdGlvbih0b2tlbikge1xuICAgICAgd2F0Y2hUb2tlbih0b2tlbilcbiAgICB9KVxuICB9KVxuXG4gIGZ1bmN0aW9uIHdhdGNoVG9rZW4odG9rZW4pIHtcbiAgICB2YXIgb2JzZXJhYmxlS2V5ID0gdm1bdG9rZW5dXG4gICAgaWYgKF8uaXNVbmRlZmluZWQob2JzZXJhYmxlS2V5KSkgcmV0dXJuXG4gICAgaWYgKF8uaXNPYnNlcmFibGUob2JzZXJhYmxlS2V5KSkge1xuICAgICAgb2JzZXJhYmxlS2V5LiQkLndhdGNoKGZuKVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnRzLmJpbmREaXIgPSBmdW5jdGlvbihhdHRyLCBub2RlLCBrdWUpIHtcbiAgdmFyIGRpck5hbWUgPSBnZXREaXJOYW1lKGF0dHIpXG4gIGlmKCFkaXJOYW1lKSByZXR1cm5cbiAgaWYoIWRpcmVjdGl2ZXNbZGlyTmFtZV0pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJEaXJlY3RpdmVcIiArIGRpck5hbWUgKyBcIiBpcyBub3QgZm91bmQuXCIpXG4gIH1cbiAgdmFyIGRpcmVjdGl2ZSA9IHBhcnNlci5wYXJzZURpcmVjdGl2ZShhdHRyLnZhbHVlKVxuICB2YXIgdG9rZW5zID0gZ2V0VG9rZW5zRnJvbURpcmVjdGl2ZShkaXJlY3RpdmUpXG4gIHZhciBkaXJPYmogPSBkaXJlY3RpdmVzW2Rpck5hbWVdXG4gIGRpck9iai5iaW5kKG5vZGUsIGF0dHIsIGt1ZSlcbiAgXy5lYWNoKHRva2VucywgZnVuY3Rpb24odG9rZW4pIHtcbiAgICBrdWUudm1bdG9rZW5dLiQkLndhdGNoKGZ1bmN0aW9uKG5ld1ZhbCwgb2xkVmFsLCBvYnNlcmFibGUpIHtcbiAgICAgIGRpck9iai51cGRhdGUobm9kZSwgYXR0ciwga3VlKVxuICAgIH0pXG4gIH0pXG59XG5cbmZ1bmN0aW9uIGdldFRva2Vuc0Zyb21EaXJlY3RpdmUoZGlyZWN0aXZlKSB7XG4gIGlmIChfLmlzU3RyaW5nKGRpcmVjdGl2ZSkpIHtcbiAgICByZXR1cm4gcGFyc2VyLnBhcnNlVG9rZW5zKGRpcmVjdGl2ZSlcbiAgfSBlbHNlIHtcbiAgICB2YXIgYWxsVG9rZW5zID0gW11cbiAgICBmb3IgKGtleSBpbiBkaXJlY3RpdmUpIHtcbiAgICAgIHZhciB0b2tlbnMgPSBwYXJzZXIucGFyc2VUb2tlbnMoZGlyZWN0aXZlW2tleV0pXG4gICAgICBhbGxUb2tlbnMucHVzaC5hcHBseShhbGxUb2tlbnMsIHRva2VucylcbiAgICB9XG4gICAgcmV0dXJuIGFsbFRva2Vuc1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldERpck5hbWUoYXR0cikge1xuICB2YXIgRElSX1JFRyA9IG5ldyBSZWdFeHAoKFwiXlwiICsgY29uZmlnLmRpcmVjdGl2ZVByZWZpeCArIFwiLVwiICsgXCIoW1xcXFx3XFxcXGRdKylcIikpXG4gIHZhciByZXN1bHRzID0gYXR0ci5uYW1lLm1hdGNoKERJUl9SRUcpXG4gIGlmKHJlc3VsdHMpIHtcbiAgICByZXR1cm4gcmVzdWx0c1sxXVxuICB9XG4gIHJldHVybiB2b2lkIDY2NlxufVxuXG5leHBvcnRzLmdldFRva2Vuc0Zyb21EaXJlY3RpdmUgPSBnZXRUb2tlbnNGcm9tRGlyZWN0aXZlIiwidmFyIGNvbmZpZyA9IGV4cG9ydHNcblxuY29uZmlnLm9wZW5UYWcgPSBcIntcIlxuY29uZmlnLmNsb3NlVGFnID0gXCJ9XCJcbmNvbmZpZy5kaXJlY3RpdmVQcmVmaXggPSBcImtcIlxuIiwidmFyICQgPSByZXF1aXJlKFwiLi4vZG9tXCIpXG5cbmV4cG9ydHNbXCJzaG93XCJdID0ge1xuICBiaW5kOiBmdW5jdGlvbihlbGUsIGF0dHIsIGt1ZSkge1xuICAgIHRoaXMudXBkYXRlKGVsZSwgYXR0ciwga3VlKVxuICB9LFxuICB1cGRhdGU6IGZ1bmN0aW9uKGVsZSwgYXR0ciwga3VlKSB7XG4gICAgJChlbGUpLmNzcyhcImRpc3BsYXlcIiwga3VlLnZtW2F0dHIudmFsdWVdKCkgPyBcImJsb2NrXCI6IFwibm9uZVwiKVxuICB9XG59XG4iLCJ2YXIgJCA9IGZ1bmN0aW9uKGRvbSkge1xuICByZXR1cm4ge1xuICAgIGVsOiBkb20sXG4gICAgYXR0cjogZnVuY3Rpb24oYXR0ciwgbmFtZSkge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuZWwuZ2V0QXR0cmlidXRlKGF0dHIpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVsLnNldEF0dHJpYnV0ZShhdHRyLCBuYW1lKVxuICAgICAgfVxuICAgIH0sXG4gICAgY3NzOiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICB0aGlzLmVsLnN0eWxlW2tleV1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWwuc3R5bGVba2V5XSA9IHZhbHVlXG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbm1vZHVsZS5leHBvcnRzID0gJCIsInZhciBfID0gcmVxdWlyZShcIi4vdXRpbC5qc1wiKVxuXG5mdW5jdGlvbiBPYnNlcmFibGVLZXkoYXR0cikge1xuICB2YXIgdGhhdCA9IHRoaXNcbiAgdGhpcy52YWx1ZSA9IGF0dHJcbiAgdGhpcy53YXRjaGVycyA9IFtdXG4gIGZ1bmN0aW9uIGdldE9yU2V0KGF0dHIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHRoYXQudmFsdWVcbiAgICB9XG4gICAgdGhhdC5vbGRWYWx1ZSA9IHRoaXMudmFsdWVcbiAgICB0aGF0LnZhbHVlID0gYXR0clxuICAgIHRoYXQubm90aWZ5KClcbiAgfVxuICBnZXRPclNldC4kJCA9IHRoYXRcbiAgcmV0dXJuIGdldE9yU2V0XG59XG5cbk9ic2VyYWJsZUtleS5wcm90b3R5cGUubm90aWZ5ID0gZnVuY3Rpb24oKSB7XG4gIHZhciB0aGF0ID0gdGhpc1xuICBfLmVhY2godGhpcy53YXRjaGVycywgZnVuY3Rpb24od2F0Y2hlcikge1xuICAgIHdhdGNoZXIodGhhdC52YWx1ZSwgdGhhdC5vbGRWYWx1ZSwgdGhhdClcbiAgfSlcbn1cblxuT2JzZXJhYmxlS2V5LnByb3RvdHlwZS53YXRjaCA9IGZ1bmN0aW9uKGZuKSB7XG4gIHRoaXMud2F0Y2hlcnMucHVzaChmbilcbn1cblxuZnVuY3Rpb24gT2JzZXJhYmxlQXJyYXkoYXJyKSB7XG4gIFxufVxuXG5mdW5jdGlvbiBvYnNlcmFibGUob2JqKSB7XG4gIGlmICghXy5pc0FycmF5KG9iaikpIHtcbiAgICByZXR1cm4gbmV3IE9ic2VyYWJsZUtleShvYmopXG4gIH0gZWxzZSB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcmFibGVBcnJheShvYmopXG4gIH1cbn1cblxub2JzZXJhYmxlLk9ic2VyYWJsZUtleSA9IE9ic2VyYWJsZUtleVxub2JzZXJhYmxlLk9ic2VyYWJsZUFycmF5ID0gT2JzZXJhYmxlQXJyYXlcblxubW9kdWxlLmV4cG9ydHMgPSBvYnNlcmFibGVcbiIsInZhciBjb25maWcgPSByZXF1aXJlKFwiLi9jb25maWdcIilcbnZhciBfID0gcmVxdWlyZShcIi4vdXRpbFwiKVxuXG52YXIgU1BFQ0lBTF9DSEFSUyA9IC8oXFwqXFwuXFw/XFwrXFwkXFxeXFxbXFxdXFwoXFwpXFx7XFx9XFx8XFxcXFxcLykvZ1xudmFyIG9wZW5UYWcsIGNsb3NlVGFnLCBFWFBfUkVHLCBSRU1PVkVfUkVHXG5cbmZ1bmN0aW9uIG1ha2VSRUcoKSB7XG4gIG9wZW5UYWcgPSBjb25maWcub3BlblRhZy5yZXBsYWNlKFNQRUNJQUxfQ0hBUlMsIFwiXFxcXCQxXCIpXG4gIGNsb3NlVGFnID0gY29uZmlnLmNsb3NlVGFnLnJlcGxhY2UoU1BFQ0lBTF9DSEFSUywgXCJcXFxcJDFcIilcblxuICBFWFBfUkVHID0gbmV3IFJlZ0V4cChvcGVuVGFnICsgXCJbXFxcXFNcXFxcc10rP1wiICsgY2xvc2VUYWcsICdnJylcbiAgUkVNT1ZFX1JFRyA9IG5ldyBSZWdFeHAob3BlblRhZyArIFwifFwiICsgY2xvc2VUYWcsICdnJylcbn1cblxuZXhwb3J0cy5nZXRSYXdFeHBzID0gZnVuY3Rpb24odGV4dCkge1xuICB2YXIgcmVzdWx0cyA9IHRleHQubWF0Y2goRVhQX1JFRykgfHwgW11cbiAgcmV0dXJuIHJlc3VsdHNcbn1cblxuZXhwb3J0cy5nZXRFeHBGcm9tUmF3RXhwID0gZnVuY3Rpb24ocmF3RXhwKSB7XG4gIHJldHVybiByYXdFeHAucmVwbGFjZShSRU1PVkVfUkVHLCBcIlwiKVxufVxuXG4vKiogXG4gKiBTdGVhbCBmcm9tIFZ1ZS5qczogXG4gKiBodHRwczovL2dpdGh1Yi5jb20veXl4OTkwODAzL3Z1ZS9ibG9iL2Rldi9zcmMvcGFyc2Vycy9leHByZXNzaW9uLmpzXG4gKi9cbnZhciBLRVlXT1JEX1JFRyA9IC9bX1xcd11bXyRcXHdcXGRdKy9nXG52YXIgaWdub3JlS2V5d29yZHMgPVxuICAnTWF0aCxEYXRlLHRoaXMsdHJ1ZSxmYWxzZSxudWxsLHVuZGVmaW5lZCxJbmZpbml0eSxOYU4sJyArXG4gICdpc05hTixpc0Zpbml0ZSxkZWNvZGVVUkksZGVjb2RlVVJJQ29tcG9uZW50LGVuY29kZVVSSSwnICtcbiAgJ2VuY29kZVVSSUNvbXBvbmVudCxwYXJzZUludCxwYXJzZUZsb2F0LGluJ1xudmFyIElHTk9SRV9LRVlXT1JEU19SRUcgPSBcbiAgbmV3IFJlZ0V4cCgnXignICsgaWdub3JlS2V5d29yZHMucmVwbGFjZSgvLC9nLCAnXFxcXGJ8JykgKyAnXFxcXGIpJylcblxuLyoqXG4gKiBQYXJzZSB0ZXh0IGFuZCByZXR1cm4gZXhwcmVzc2lvbnMuXG4gKiBAcGFyYW0ge1N0cmluZ30gdGV4dFxuICogQHJldHVybiB7QXJyYXk8T2JqZWN0Pn1cbiAqICAgICAgICAgICAgICAgLSByYXdFeHAge1N0cmluZ30gICAgICAgICBlLmcgXCJ7Zmlyc3ROYW1lKCkgKyBsYXN0TmFtZSgpfVwiXG4gKiAgICAgICAgICAgICAgIC0gZXhwIHtTdHJpbmd9ICAgICAgICAgICAgZS5nIFwiZmlyc3ROYW1lKCkgKyBsYXN0TmFtZSgpXCJcbiAqICAgICAgICAgICAgICAgLSB0b2tlbnMge0FycmF5PFN0cmluZz59ICBlLmcgW1wiZmlyc3ROYW1lXCIsIFwibGFzdE5hbWVcIl1cbiAqL1xuZXhwb3J0cy5wYXJzZSA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgbWFrZVJFRygpXG4gIHZhciByYXdFeHBzID0gZXhwb3J0cy5nZXRSYXdFeHBzKHRleHQpXG4gIHZhciBleHByZXNzaW9ucyA9IFtdXG4gIF8uZWFjaChyYXdFeHBzLCBmdW5jdGlvbihyYXdFeHApIHtcbiAgICB2YXIgZXhwID0gZXhwb3J0cy5nZXRFeHBGcm9tUmF3RXhwKHJhd0V4cClcbiAgICB2YXIgZXhwcmVzc2lvbiA9IHtcbiAgICAgIHJhd0V4cDogcmF3RXhwLFxuICAgICAgZXhwOiBleHAsXG4gICAgICB0b2tlbnM6IGV4cG9ydHMucGFyc2VUb2tlbnMoZXhwKSBcbiAgICB9XG4gICAgZXhwcmVzc2lvbnMucHVzaChleHByZXNzaW9uKVxuICB9KVxuICByZXR1cm4gZXhwcmVzc2lvbnMgXG59XG5cbmV4cG9ydHMucGFyc2VUb2tlbnMgPSBmdW5jdGlvbihleHApIHtcbiAgLy8gVE9ETzogVG8gb3B0aW16ZSB0aGlzIHJlZ3VsYXIgZXhwcmVzc2lvbiB0byBhdm9pZCB0aGlzIGNhc2U6XG4gIC8vIFwiJ0lcXCdtICcgKyBuYW1lKClcIlxuICB2YXIgU1RSSU5HX1JFRyA9IC8oJ1tcXHNcXFNdKj8nKXwoXCJbXFxzXFxTXSo/XCIpL2dcbiAgZXhwID0gZXhwLnJlcGxhY2UoU1RSSU5HX1JFRywgJycpXG4gIHZhciBjYW5kaWRhdGVzID0gZXhwLm1hdGNoKEtFWVdPUkRfUkVHKSB8fCBbXVxuICB2YXIgdG9rZW5zTWFwID0ge31cbiAgdmFyIHRva2VucyA9IFtdXG4gIF8uZWFjaChjYW5kaWRhdGVzLCBmdW5jdGlvbihjYW5kaWRhdGUpIHtcbiAgICBpZiAoSUdOT1JFX0tFWVdPUkRTX1JFRy50ZXN0KGNhbmRpZGF0ZSkpIHJldHVyblxuICAgIHRva2Vuc01hcFtjYW5kaWRhdGVdID0gMVxuICB9KVxuICBmb3IodmFyIGtleSBpbiB0b2tlbnNNYXApIHtcbiAgICB0b2tlbnMucHVzaChrZXkpXG4gIH1cbiAgcmV0dXJuIHRva2Vuc1xufVxuICAgIFxuXG5leHBvcnRzLmV4ZWMgPSBmdW5jdGlvbihleHByZXNzaW9uLCB2bSkge1xuICB2YXIgYXJncyA9IFtdXG4gIHZhciB0b2tlbnMgPSBleHByZXNzaW9uLnRva2Vuc1xuICBfLmVhY2godG9rZW5zLCBmdW5jdGlvbih0b2tlbikge1xuICAgIGFyZ3MucHVzaCh2bVt0b2tlbl0pXG4gIH0pXG4gIHZhciBleHAgPSBcInJldHVybiBcIiArIGV4cHJlc3Npb24uZXhwICsgXCI7XCJcbiAgcmV0dXJuIChuZXcgRnVuY3Rpb24odG9rZW5zLCBleHApKS5hcHBseSh2bSwgYXJncylcbn1cblxuZXhwb3J0cy5wYXJzZURpcmVjdGl2ZSA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gIHZhciBTVFJJTkdfRElSX1JFRyA9IC9eW18kXFx3XVtfJFxcd1xcZFxcc10qJC9cbiAgdmFyIHZhbHVlID0gXy50cmltKHZhbHVlKVxuICBpZiAodmFsdWUubGVuZ3RoID09PSAwIHx8IFNUUklOR19ESVJfUkVHLnRlc3QodmFsdWUpKSB7XG4gICAgcmV0dXJuIHZhbHVlXG4gIH0gZWxzZSB7XG4gICAgdmFyIHJldCA9IHt9XG4gICAgXy5lYWNoKHZhbHVlLnNwbGl0KFwiLFwiKSwgZnVuY3Rpb24obWFwKSB7XG4gICAgICB2YXIga3YgPSBtYXAuc3BsaXQoXCI6XCIpXG4gICAgICB2YXIga2V5ID0gY2xlYW5RdW90ZXMoXy50cmltKGt2WzBdKSlcbiAgICAgIHZhciB2YWx1ZSA9IF8udHJpbShrdlsxXSlcbiAgICAgIHJldFtrZXldID0gdmFsdWVcbiAgICB9KVxuICAgIHJldHVybiByZXRcbiAgfVxufVxuXG5mdW5jdGlvbiBjbGVhblF1b3RlcyhzdHIpIHtcbiAgdmFyIFFVT1RFX1JFRyA9IC9bXCInXS9nXG4gIHJldHVybiBzdHIucmVwbGFjZShRVU9URV9SRUcsIFwiXCIpXG59XG5tYWtlUkVHKCkiLCJ2YXIgb2JzZXJhYmxlID0gcmVxdWlyZShcIi4vb2JzZXJhYmxlXCIpXG5cbmV4cG9ydHMuaXNPYnNlcmFibGUgPSBmdW5jdGlvbihvYmopIHtcbiAgdmFyIG9iaiA9IG9iai4kJFxuICByZXR1cm4gKG9iaiBpbnN0YW5jZW9mIG9ic2VyYWJsZS5PYnNlcmFibGVLZXkpIHx8XG4gICAgICAgICAob2JqIGluc3RhbmNlb2Ygb2JzZXJhYmxlLk9ic2VyYWJsZUFycmF5KVxufVxuXG5leHBvcnRzLm1hcCA9IGZ1bmN0aW9uKGFyciwgZm4pIHtcbiAgdmFyIHJlc3VsdHMgPSBbXVxuICBmb3IodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuO2kgKyspIHtcbiAgICByZXN1bHRzLnB1c2goZm4oYXJyW2ldKSlcbiAgfVxuICByZXR1cm4gcmVzdWx0c1xufVxuXG5leHBvcnRzLmlzQXJyYXkgPSBmdW5jdGlvbihhcnIpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcnIpID09PSAnW29iamVjdCBBcnJheV0nXG59XG5cbmV4cG9ydHMuZWFjaCA9IGZ1bmN0aW9uKGFyciwgZm4pIHtcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFyci5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGZuKGFycltpXSlcbiAgfVxufVxuXG5leHBvcnRzLmlzVW5kZWZpbmVkID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiBvYmogPT09IHZvaWQgNjY2O1xufVxuXG5leHBvcnRzLnRyaW0gPSBmdW5jdGlvbihzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC8oXlxccyspfFxccyskL2csIFwiXCIpXG59XG5cbi8qKlxuICogQWRkIHNvbWUgaXNUeXBlIG1ldGhvZHM6IGlzQXJndW1lbnRzLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzRGF0ZSwgaXNSZWdFeHAsIGlzRXJyb3IuXG4gKiBzdGVhbCBmcm9tIHVuZGVyc2NvcmU6IGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL2RvY3MvdW5kZXJzY29yZS5odG1sXG4gKi9cbmV4cG9ydHMuZWFjaChbJ0FyZ3VtZW50cycsICdGdW5jdGlvbicsICdTdHJpbmcnLCAnTnVtYmVyJywgJ0RhdGUnLCAnUmVnRXhwJywgJ0Vycm9yJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgZXhwb3J0c1snaXMnICsgbmFtZV0gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0ICcgKyBuYW1lICsgJ10nO1xuICB9O1xufSk7XG4iLCIvL3JlcXVpcmUoXCIuL3NwZWNzL3NhbXBsZS5qc1wiKVxucmVxdWlyZShcIi4vc3BlY3MvdXRpbC5qc1wiKVxucmVxdWlyZShcIi4vc3BlY3Mvb2JzZXJhYmxlLmpzXCIpXG5yZXF1aXJlKFwiLi9zcGVjcy9wYXJzZXIuanNcIilcbnJlcXVpcmUoXCIuL3NwZWNzL2JpbmRlci5qc1wiKVxuIiwidmFyIGJpbmRlciA9IHJlcXVpcmUoXCIuLi8uLi9zcmMvYmluZGVyXCIpXG5cbmRlc2NyaWJlKFwiVGVzdCBiaW5kZXJcIiwgZnVuY3Rpb24oKSB7XG4gIGl0KFwiR2V0IHRva2VucyBmcm9tIGRpZmZlcmVudCBkaXJlY3RpdmVcIiwgZnVuY3Rpb24oKSB7XG4gICAgYmluZGVyLmdldFRva2Vuc0Zyb21EaXJlY3RpdmUoXCJ0b2tlbiBpbiB0b2tlbnNcIilcbiAgICAgICAgLnNob3VsZC5iZS5kZWVwLmVxdWFsKFtcInRva2VuXCIsIFwidG9rZW5zXCJdKVxuICAgIGJpbmRlci5nZXRUb2tlbnNGcm9tRGlyZWN0aXZlKHtcbiAgICAgICAgICBcImNvbG9yXCI6IFwiJ3JlZCdcIixcbiAgICAgICAgICBcIidmb250LXNpemUnXCI6IFwic2l6ZSgpICsgJ3B4J1wiLFxuICAgICAgICAgIFwibmFtZVwiOiBcImplcnJ5KClcIixcbiAgICAgICAgICBcIndpZHRoXCI6IFwid2lkdGgoKSArICdweCdcIlxuICAgICAgICB9KS5zaG91bGQuYmUuZGVlcC5lcXVhbChbXCJzaXplXCIsIFwiamVycnlcIiwgXCJ3aWR0aFwiXSlcbiAgfSlcbn0pIiwidmFyIG9ic2VyYWJsZSA9IHJlcXVpcmUoXCIuLi8uLi9zcmMvb2JzZXJhYmxlLmpzXCIpXG5cbmRlc2NyaWJlKFwiVGVzdCBvYnNlcmFibGVcIiwgZnVuY3Rpb24oKSB7XG4gIGRlc2NyaWJlKFwiVGVzdCBvYnNlcmFibGUgc3RyaW5nIGF0dHJpYnV0ZVwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXR0ciA9IG51bGw7XG5cbiAgICBiZWZvcmUoZnVuY3Rpb24oKSB7XG4gICAgICBhdHRyID0gb2JzZXJhYmxlKFwiaSBsb3ZlIHlvdVwiKVxuICAgIH0pXG5cbiAgICBpdChcIkluaXRpYWxpemluZyBkZWZhdWx0IHZhbHVlIGFuZCBnZXQgaXQuXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgYXR0cigpLnNob3VsZC5iZS5lcXVhbChcImkgbG92ZSB5b3VcIilcbiAgICB9KVxuXG4gICAgaXQoXCJXYXRjaGVyIGZ1bmN0aW9uIHNob3VsZCBiZSBpbnZva2VkIHdoZW4gdmFsdWUgaXMgY2hhbmdlZC5cIiwgZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgd2F0Y2hlciA9IHNpbm9uLnNweSgpXG4gICAgICBhdHRyLiQkLndhdGNoKHdhdGNoZXIpXG4gICAgICB2YXIgdmFsID0gXCJpIGxvdmUgeW91LCB0b29cIlxuICAgICAgYXR0cih2YWwpXG4gICAgICB3YXRjaGVyLnNob3VsZC5oYXZlLmJlZW4uY2FsbGVkV2l0aCh2YWwsIHZvaWQgNjY2LCBhdHRyLiQkKVxuICAgICAgd2F0Y2hlci5zaG91bGQuaGF2ZS5iZWVuLmNhbGxlZE9uY2VcbiAgICAgIGF0dHIoKS5zaG91bGQuYmUuZXF1YWwoXCJpIGxvdmUgeW91LCB0b29cIilcbiAgICB9KVxuXG4gIH0pXG59KSIsInZhciBwYXJzZXIgPSByZXF1aXJlKFwiLi4vLi4vc3JjL3BhcnNlclwiKVxudmFyIGNvbmZpZyA9IHJlcXVpcmUoXCIuLi8uLi9zcmMvY29uZmlnXCIpXG5cbmRlc2NyaWJlKFwiVGVzdCBwYXJzZXJcIiwgZnVuY3Rpb24oKSB7XG5cbiAgaXQoXCJHZXQgcmF3IGV4cHJlc3Npb25zIGZyb20gdGV4dC5cIiwgZnVuY3Rpb24oKSB7XG4gICAgcGFyc2VyLmdldFJhd0V4cHMoXCJ7Zmlyc3ROYW1lICsgbGFzdE5hbWV9IGlzIG15IHtuYW1lfVwiKVxuICAgICAgICAgIC5zaG91bGQuYmUuZGVlcC5lcXVhbChbXCJ7Zmlyc3ROYW1lICsgbGFzdE5hbWV9XCIsIFwie25hbWV9XCJdKVxuICB9KVxuXG4gIGl0KFwiR2V0IGV4cHJlc3Npb24gb2JqZWN0cyBmcm9tIHRleHQuXCIsIGZ1bmN0aW9uKCkge1xuICAgIHBhcnNlci5wYXJzZShcIntuYW1lKCkgPT09IHRydWUgPyBnb29kKCkgKyAneWUnOiBiYWQoKX1cIilcbiAgICAgICAgICAuc2hvdWxkLmJlLmRlZXAuZXF1YWwoW3tcbiAgICAgICAgICAgIHJhd0V4cDogXCJ7bmFtZSgpID09PSB0cnVlID8gZ29vZCgpICsgJ3llJzogYmFkKCl9XCIsXG4gICAgICAgICAgICBleHA6IFwibmFtZSgpID09PSB0cnVlID8gZ29vZCgpICsgJ3llJzogYmFkKClcIixcbiAgICAgICAgICAgIHRva2VuczogW1wibmFtZVwiLCBcImdvb2RcIiwgXCJiYWRcIl1cbiAgICAgICAgICB9XSlcbiAgICBwYXJzZXIucGFyc2UoJ3tuYW1lKCkgKyBcIkdvb2RcXCcgbmFtZSBpcyBteSBsb3ZlXCJ9JylcbiAgICAgICAgICAuc2hvdWxkLmJlLmRlZXAuZXF1YWwoW3tcbiAgICAgICAgICAgIHJhd0V4cDogJ3tuYW1lKCkgKyBcIkdvb2RcXCcgbmFtZSBpcyBteSBsb3ZlXCJ9JyxcbiAgICAgICAgICAgIGV4cDogJ25hbWUoKSArIFwiR29vZFxcJyBuYW1lIGlzIG15IGxvdmVcIicsXG4gICAgICAgICAgICB0b2tlbnM6IFtcIm5hbWVcIl1cbiAgICAgICAgICB9XSlcbiAgICBwYXJzZXIucGFyc2UoXCJUb2RheSB0b3RhbENvdW50IGlzIHtwYXJzZUZsb2F0KHRvdGFsQ291bnQoKSkgKyAnSGVsbG8nfSwge25hbWV9IHNob3VsZCBtYWtlIGl0LlwiKVxuICAgICAgICAgIC5zaG91bGQuYmUuZGVlcC5lcXVhbChbe1xuICAgICAgICAgICAgcmF3RXhwOiBcIntwYXJzZUZsb2F0KHRvdGFsQ291bnQoKSkgKyAnSGVsbG8nfVwiLFxuICAgICAgICAgICAgZXhwOiBcInBhcnNlRmxvYXQodG90YWxDb3VudCgpKSArICdIZWxsbydcIixcbiAgICAgICAgICAgIHRva2VuczogW1widG90YWxDb3VudFwiXVxuICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgIHJhd0V4cDogXCJ7bmFtZX1cIixcbiAgICAgICAgICAgIGV4cDogXCJuYW1lXCIsXG4gICAgICAgICAgICB0b2tlbnM6IFtcIm5hbWVcIl1cbiAgICAgICAgICB9XSlcbiAgfSlcblxuICBpdChcIkV4ZWN1dGUgYW4gZXhwcmVzc2lvbi5cIiwgZnVuY3Rpb24oKSB7XG4gICAgcGFyc2VyLmV4ZWMoe1xuICAgICAgZXhwOiBcInRoaXMubHVjeSArIG5hbWUoKSArIDFcIixcbiAgICAgIHRva2VuczogW1wibmFtZVwiXVxuICAgIH0sIHtcbiAgICAgIG5hbWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gXCJKZXJyeSFcIlxuICAgICAgfSxcbiAgICAgIGx1Y3k6IFwiZ29vZFwiXG4gICAgfSkuc2hvdWxkLmJlLmVxdWFsKFwiZ29vZEplcnJ5ITFcIilcbiAgfSlcblxuICBpdChcIlBhcnNlIHdpdGggY3VzdG9tIG9wZW4gYW5kIGNsb3NlIHRhZy5cIiwgZnVuY3Rpb24oKSB7XG4gICAgY29uZmlnLm9wZW5UYWcgPSBcInt7XCJcbiAgICBjb25maWcuY2xvc2VUYWcgPSBcIn19XCJcbiAgICBwYXJzZXIucGFyc2UoXCJ7e25hbWUoKSA9PT0gdHJ1ZSA/IGdvb2QoKTogYmFkKCl9fVwiKVxuICAgICAgICAgIC5zaG91bGQuYmUuZGVlcC5lcXVhbChbe1xuICAgICAgICAgICAgcmF3RXhwOiBcInt7bmFtZSgpID09PSB0cnVlID8gZ29vZCgpOiBiYWQoKX19XCIsXG4gICAgICAgICAgICBleHA6IFwibmFtZSgpID09PSB0cnVlID8gZ29vZCgpOiBiYWQoKVwiLFxuICAgICAgICAgICAgdG9rZW5zOiBbXCJuYW1lXCIsIFwiZ29vZFwiLCBcImJhZFwiXVxuICAgICAgICAgIH1dKVxuICB9KVxuXG4gIGl0KFwiUGFyc2Ugc3RyaW5nIGRpcmVjdGl2ZS5cIiwgZnVuY3Rpb24oKSB7XG4gICAgcGFyc2VyLnBhcnNlRGlyZWN0aXZlKFwidXNlcnNcIikuc2hvdWxkLmJlLmVxdWFsKFwidXNlcnNcIilcbiAgICBwYXJzZXIucGFyc2VEaXJlY3RpdmUoXCJ1c2VyIGluIHVzZXJzXCIpLnNob3VsZC5iZS5lcXVhbChcInVzZXIgaW4gdXNlcnNcIilcbiAgfSlcblxuICBpdChcIlBhcnNlIGtleS12YWx1ZSBkaXJlY3RpdmUuXCIsIGZ1bmN0aW9uKCkge1xuICAgIHBhcnNlci5wYXJzZURpcmVjdGl2ZShcImNvbG9yOiByZWQsICdmb250LXNpemUnOiAnMTJweCdcIilcbiAgICAgICAgICAuc2hvdWxkLmJlLmRlZXAuZXF1YWwoe1xuICAgICAgICAgICAgXCJjb2xvclwiOiBcInJlZFwiLFxuICAgICAgICAgICAgXCJmb250LXNpemVcIjogXCInMTJweCdcIlxuICAgICAgICAgIH0pXG4gIH0pXG5cbiAgaXQoXCJQYXNlIG9ubHkgb25lIHRpbWVcIiwgZnVuY3Rpb24oKSB7XG4gICAgcGFyc2VyLnBhcnNlVG9rZW5zKFwibmFtZSArIG5hbWUgKyBuYW1lICsgamVycnlcIikuc2hvdWxkLmJlLmRlZXAuZXF1YWwoW1wibmFtZVwiLCBcImplcnJ5XCJdKVxuICB9KVxufSkiLCJfID0gcmVxdWlyZShcIi4uLy4uL3NyYy91dGlsLmpzXCIpXG5cbmRlc2NyaWJlKFwiVGVzdCB1dGlscyBmdW5jdGlvbnNcIiwgZnVuY3Rpb24oKSB7XG4gIGl0KFwibWFwXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcnIgPSBbMSwgMiwgMywgNF1cbiAgICB2YXIgbmV3QXJyID0gXy5tYXAoYXJyLCBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiB2YWwgKiAyXG4gICAgfSlcbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGFycltpXSA9IGFycltpXSAqIDJcbiAgICB9XG4gICAgYXJyLnNob3VsZC5iZS5kZWVwLmVxdWFsKG5ld0FycilcbiAgfSlcbiAgaXQoXCJ0cmltXCIsIGZ1bmN0aW9uKCkge1xuICAgIF8udHJpbShcIiBpIGxvdmUgeW91ICAgIFwiKS5zaG91bGQuYmUuZXF1YWwoXCJpIGxvdmUgeW91XCIpXG4gIH0pXG59KSJdfQ==
