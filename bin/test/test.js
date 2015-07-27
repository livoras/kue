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
    var obserableKey = kue.vm[token]
    if (_.isUndefined(obserableKey)) return
    if (_.isObserable(obserableKey)) {
      obserableKey.$$.watch(function(newVal, oldVal, obserable) {
        dirObj.update(node, attr, kue)
      })
    }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL2JpbmRlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvY29uZmlnLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9kaXJlY3RpdmVzL2luZGV4LmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9kb20uanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL29ic2VyYWJsZS5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvcGFyc2VyLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy91dGlsLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3Rlc3QvZmFrZV9kNDQxMjcyYi5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L3NwZWNzL2JpbmRlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L3NwZWNzL29ic2VyYWJsZS5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L3NwZWNzL3BhcnNlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L3NwZWNzL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNiQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGNvbmZpZyA9IHJlcXVpcmUoXCIuL2NvbmZpZ1wiKVxudmFyIF8gPSByZXF1aXJlKFwiLi91dGlsXCIpXG52YXIgcGFyc2VyID0gcmVxdWlyZShcIi4vcGFyc2VyXCIpXG52YXIgZGlyZWN0aXZlcyA9IHJlcXVpcmUoXCIuL2RpcmVjdGl2ZXNcIilcblxuZXhwb3J0cy5iaW5kVGV4dCA9IGZ1bmN0aW9uKHRleHROb2RlLCBrdWUpIHtcbiAgdmFyIHZtID0ga3VlLnZtXG4gIHZhciB0ZXh0ID0gdGV4dE5vZGUudGV4dENvbnRlbnQgfHwgdGV4dE5vZGUubm9kZVZhbHVlIC8vIGZ1Y2sgSUU3LCA4XG4gIHZhciBleHByZXNzaW9ucyA9IHBhcnNlci5wYXJzZSh0ZXh0KVxuICBmdW5jdGlvbiB3cml0ZVJlc3VsdCgpIHtcbiAgICB2YXIgdGV4dFRwbCA9IHRleHRcbiAgICBfLmVhY2goZXhwcmVzc2lvbnMsIGZ1bmN0aW9uKGV4cHJlc3Npb24pIHtcbiAgICAgIHZhciByZXN1bHQgPSBwYXJzZXIuZXhlYyhleHByZXNzaW9uLCB2bSlcbiAgICAgIHRleHRUcGwgPSB0ZXh0VHBsLnJlcGxhY2UoZXhwcmVzc2lvbi5yYXdFeHAsIHJlc3VsdClcbiAgICB9KVxuICAgIGlmICh0ZXh0Tm9kZS5ub2RlVmFsdWUpIHtcbiAgICAgIHRleHROb2RlLm5vZGVWYWx1ZSA9IHRleHRUcGxcbiAgICB9IGVsc2Uge1xuICAgICAgdGV4dE5vZGUudGV4dE5vZGUgPSB0ZXh0VHBsXG4gICAgfVxuICB9XG4gIHdyaXRlUmVzdWx0KClcbiAgd2F0Y2hBbGxUb2tlbnMoZXhwcmVzc2lvbnMsIGt1ZSwgd3JpdGVSZXN1bHQpXG59XG5cbmZ1bmN0aW9uIHdhdGNoQWxsVG9rZW5zKGV4cHJlc3Npb25zLCBrdWUsIGZuKSB7XG4gIHZhciB2bSA9IGt1ZS52bVxuICBfLmVhY2goZXhwcmVzc2lvbnMsIGZ1bmN0aW9uKGV4cHJlc3Npb24pIHtcbiAgICBfLmVhY2goZXhwcmVzc2lvbi50b2tlbnMsIGZ1bmN0aW9uKHRva2VuKSB7XG4gICAgICB3YXRjaFRva2VuKHRva2VuKVxuICAgIH0pXG4gIH0pXG5cbiAgZnVuY3Rpb24gd2F0Y2hUb2tlbih0b2tlbikge1xuICAgIHZhciBvYnNlcmFibGVLZXkgPSB2bVt0b2tlbl1cbiAgICBpZiAoXy5pc1VuZGVmaW5lZChvYnNlcmFibGVLZXkpKSByZXR1cm5cbiAgICBpZiAoXy5pc09ic2VyYWJsZShvYnNlcmFibGVLZXkpKSB7XG4gICAgICBvYnNlcmFibGVLZXkuJCQud2F0Y2goZm4pXG4gICAgfVxuICB9XG59XG5cbmV4cG9ydHMuYmluZERpciA9IGZ1bmN0aW9uKGF0dHIsIG5vZGUsIGt1ZSkge1xuICB2YXIgZGlyTmFtZSA9IGdldERpck5hbWUoYXR0cilcbiAgaWYoIWRpck5hbWUpIHJldHVyblxuICBpZighZGlyZWN0aXZlc1tkaXJOYW1lXSkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkRpcmVjdGl2ZVwiICsgZGlyTmFtZSArIFwiIGlzIG5vdCBmb3VuZC5cIilcbiAgfVxuICB2YXIgZGlyZWN0aXZlID0gcGFyc2VyLnBhcnNlRGlyZWN0aXZlKGF0dHIudmFsdWUpXG4gIHZhciB0b2tlbnMgPSBnZXRUb2tlbnNGcm9tRGlyZWN0aXZlKGRpcmVjdGl2ZSlcbiAgdmFyIGRpck9iaiA9IGRpcmVjdGl2ZXNbZGlyTmFtZV1cbiAgZGlyT2JqLmJpbmQobm9kZSwgYXR0ciwga3VlKVxuICBfLmVhY2godG9rZW5zLCBmdW5jdGlvbih0b2tlbikge1xuICAgIHZhciBvYnNlcmFibGVLZXkgPSBrdWUudm1bdG9rZW5dXG4gICAgaWYgKF8uaXNVbmRlZmluZWQob2JzZXJhYmxlS2V5KSkgcmV0dXJuXG4gICAgaWYgKF8uaXNPYnNlcmFibGUob2JzZXJhYmxlS2V5KSkge1xuICAgICAgb2JzZXJhYmxlS2V5LiQkLndhdGNoKGZ1bmN0aW9uKG5ld1ZhbCwgb2xkVmFsLCBvYnNlcmFibGUpIHtcbiAgICAgICAgZGlyT2JqLnVwZGF0ZShub2RlLCBhdHRyLCBrdWUpXG4gICAgICB9KVxuICAgIH1cbiAgfSlcbn1cblxuZnVuY3Rpb24gZ2V0VG9rZW5zRnJvbURpcmVjdGl2ZShkaXJlY3RpdmUpIHtcbiAgaWYgKF8uaXNTdHJpbmcoZGlyZWN0aXZlKSkge1xuICAgIHJldHVybiBwYXJzZXIucGFyc2VUb2tlbnMoZGlyZWN0aXZlKVxuICB9IGVsc2Uge1xuICAgIHZhciBhbGxUb2tlbnMgPSBbXVxuICAgIGZvciAoa2V5IGluIGRpcmVjdGl2ZSkge1xuICAgICAgdmFyIHRva2VucyA9IHBhcnNlci5wYXJzZVRva2VucyhkaXJlY3RpdmVba2V5XSlcbiAgICAgIGFsbFRva2Vucy5wdXNoLmFwcGx5KGFsbFRva2VucywgdG9rZW5zKVxuICAgIH1cbiAgICByZXR1cm4gYWxsVG9rZW5zXG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0RGlyTmFtZShhdHRyKSB7XG4gIHZhciBESVJfUkVHID0gbmV3IFJlZ0V4cCgoXCJeXCIgKyBjb25maWcuZGlyZWN0aXZlUHJlZml4ICsgXCItXCIgKyBcIihbXFxcXHdcXFxcZF0rKVwiKSlcbiAgdmFyIHJlc3VsdHMgPSBhdHRyLm5hbWUubWF0Y2goRElSX1JFRylcbiAgaWYocmVzdWx0cykge1xuICAgIHJldHVybiByZXN1bHRzWzFdXG4gIH1cbiAgcmV0dXJuIHZvaWQgNjY2XG59XG5cbmV4cG9ydHMuZ2V0VG9rZW5zRnJvbURpcmVjdGl2ZSA9IGdldFRva2Vuc0Zyb21EaXJlY3RpdmUiLCJ2YXIgY29uZmlnID0gZXhwb3J0c1xuXG5jb25maWcub3BlblRhZyA9IFwie1wiXG5jb25maWcuY2xvc2VUYWcgPSBcIn1cIlxuY29uZmlnLmRpcmVjdGl2ZVByZWZpeCA9IFwia1wiXG4iLCJ2YXIgJCA9IHJlcXVpcmUoXCIuLi9kb21cIilcblxuZXhwb3J0c1tcInNob3dcIl0gPSB7XG4gIGJpbmQ6IGZ1bmN0aW9uKGVsZSwgYXR0ciwga3VlKSB7XG4gICAgdGhpcy51cGRhdGUoZWxlLCBhdHRyLCBrdWUpXG4gIH0sXG4gIHVwZGF0ZTogZnVuY3Rpb24oZWxlLCBhdHRyLCBrdWUpIHtcbiAgICAkKGVsZSkuY3NzKFwiZGlzcGxheVwiLCBrdWUudm1bYXR0ci52YWx1ZV0oKSA/IFwiYmxvY2tcIjogXCJub25lXCIpXG4gIH1cbn1cbiIsInZhciAkID0gZnVuY3Rpb24oZG9tKSB7XG4gIHJldHVybiB7XG4gICAgZWw6IGRvbSxcbiAgICBhdHRyOiBmdW5jdGlvbihhdHRyLCBuYW1lKSB7XG4gICAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMSkge1xuICAgICAgICByZXR1cm4gdGhpcy5lbC5nZXRBdHRyaWJ1dGUoYXR0cilcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuZWwuc2V0QXR0cmlidXRlKGF0dHIsIG5hbWUpXG4gICAgICB9XG4gICAgfSxcbiAgICBjc3M6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHRoaXMuZWwuc3R5bGVba2V5XVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lbC5zdHlsZVtrZXldID0gdmFsdWVcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSAkIiwidmFyIF8gPSByZXF1aXJlKFwiLi91dGlsLmpzXCIpXG5cbmZ1bmN0aW9uIE9ic2VyYWJsZUtleShhdHRyKSB7XG4gIHZhciB0aGF0ID0gdGhpc1xuICB0aGlzLnZhbHVlID0gYXR0clxuICB0aGlzLndhdGNoZXJzID0gW11cbiAgZnVuY3Rpb24gZ2V0T3JTZXQoYXR0cikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdGhhdC52YWx1ZVxuICAgIH1cbiAgICB0aGF0Lm9sZFZhbHVlID0gdGhpcy52YWx1ZVxuICAgIHRoYXQudmFsdWUgPSBhdHRyXG4gICAgdGhhdC5ub3RpZnkoKVxuICB9XG4gIGdldE9yU2V0LiQkID0gdGhhdFxuICByZXR1cm4gZ2V0T3JTZXRcbn1cblxuT2JzZXJhYmxlS2V5LnByb3RvdHlwZS5ub3RpZnkgPSBmdW5jdGlvbigpIHtcbiAgdmFyIHRoYXQgPSB0aGlzXG4gIF8uZWFjaCh0aGlzLndhdGNoZXJzLCBmdW5jdGlvbih3YXRjaGVyKSB7XG4gICAgd2F0Y2hlcih0aGF0LnZhbHVlLCB0aGF0Lm9sZFZhbHVlLCB0aGF0KVxuICB9KVxufVxuXG5PYnNlcmFibGVLZXkucHJvdG90eXBlLndhdGNoID0gZnVuY3Rpb24oZm4pIHtcbiAgdGhpcy53YXRjaGVycy5wdXNoKGZuKVxufVxuXG5mdW5jdGlvbiBPYnNlcmFibGVBcnJheShhcnIpIHtcbiAgXG59XG5cbmZ1bmN0aW9uIG9ic2VyYWJsZShvYmopIHtcbiAgaWYgKCFfLmlzQXJyYXkob2JqKSkge1xuICAgIHJldHVybiBuZXcgT2JzZXJhYmxlS2V5KG9iailcbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gbmV3IE9ic2VyYWJsZUFycmF5KG9iailcbiAgfVxufVxuXG5vYnNlcmFibGUuT2JzZXJhYmxlS2V5ID0gT2JzZXJhYmxlS2V5XG5vYnNlcmFibGUuT2JzZXJhYmxlQXJyYXkgPSBPYnNlcmFibGVBcnJheVxuXG5tb2R1bGUuZXhwb3J0cyA9IG9ic2VyYWJsZVxuIiwidmFyIGNvbmZpZyA9IHJlcXVpcmUoXCIuL2NvbmZpZ1wiKVxudmFyIF8gPSByZXF1aXJlKFwiLi91dGlsXCIpXG5cbnZhciBTUEVDSUFMX0NIQVJTID0gLyhcXCpcXC5cXD9cXCtcXCRcXF5cXFtcXF1cXChcXClcXHtcXH1cXHxcXFxcXFwvKS9nXG52YXIgb3BlblRhZywgY2xvc2VUYWcsIEVYUF9SRUcsIFJFTU9WRV9SRUdcblxuZnVuY3Rpb24gbWFrZVJFRygpIHtcbiAgb3BlblRhZyA9IGNvbmZpZy5vcGVuVGFnLnJlcGxhY2UoU1BFQ0lBTF9DSEFSUywgXCJcXFxcJDFcIilcbiAgY2xvc2VUYWcgPSBjb25maWcuY2xvc2VUYWcucmVwbGFjZShTUEVDSUFMX0NIQVJTLCBcIlxcXFwkMVwiKVxuXG4gIEVYUF9SRUcgPSBuZXcgUmVnRXhwKG9wZW5UYWcgKyBcIltcXFxcU1xcXFxzXSs/XCIgKyBjbG9zZVRhZywgJ2cnKVxuICBSRU1PVkVfUkVHID0gbmV3IFJlZ0V4cChvcGVuVGFnICsgXCJ8XCIgKyBjbG9zZVRhZywgJ2cnKVxufVxuXG5leHBvcnRzLmdldFJhd0V4cHMgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIHZhciByZXN1bHRzID0gdGV4dC5tYXRjaChFWFBfUkVHKSB8fCBbXVxuICByZXR1cm4gcmVzdWx0c1xufVxuXG5leHBvcnRzLmdldEV4cEZyb21SYXdFeHAgPSBmdW5jdGlvbihyYXdFeHApIHtcbiAgcmV0dXJuIHJhd0V4cC5yZXBsYWNlKFJFTU9WRV9SRUcsIFwiXCIpXG59XG5cbi8qKiBcbiAqIFN0ZWFsIGZyb20gVnVlLmpzOiBcbiAqIGh0dHBzOi8vZ2l0aHViLmNvbS95eXg5OTA4MDMvdnVlL2Jsb2IvZGV2L3NyYy9wYXJzZXJzL2V4cHJlc3Npb24uanNcbiAqL1xudmFyIEtFWVdPUkRfUkVHID0gL1tfXFx3XVtfJFxcd1xcZF0rL2dcbnZhciBpZ25vcmVLZXl3b3JkcyA9XG4gICdNYXRoLERhdGUsdGhpcyx0cnVlLGZhbHNlLG51bGwsdW5kZWZpbmVkLEluZmluaXR5LE5hTiwnICtcbiAgJ2lzTmFOLGlzRmluaXRlLGRlY29kZVVSSSxkZWNvZGVVUklDb21wb25lbnQsZW5jb2RlVVJJLCcgK1xuICAnZW5jb2RlVVJJQ29tcG9uZW50LHBhcnNlSW50LHBhcnNlRmxvYXQsaW4nXG52YXIgSUdOT1JFX0tFWVdPUkRTX1JFRyA9IFxuICBuZXcgUmVnRXhwKCdeKCcgKyBpZ25vcmVLZXl3b3Jkcy5yZXBsYWNlKC8sL2csICdcXFxcYnwnKSArICdcXFxcYiknKVxuXG4vKipcbiAqIFBhcnNlIHRleHQgYW5kIHJldHVybiBleHByZXNzaW9ucy5cbiAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0XG4gKiBAcmV0dXJuIHtBcnJheTxPYmplY3Q+fVxuICogICAgICAgICAgICAgICAtIHJhd0V4cCB7U3RyaW5nfSAgICAgICAgIGUuZyBcIntmaXJzdE5hbWUoKSArIGxhc3ROYW1lKCl9XCJcbiAqICAgICAgICAgICAgICAgLSBleHAge1N0cmluZ30gICAgICAgICAgICBlLmcgXCJmaXJzdE5hbWUoKSArIGxhc3ROYW1lKClcIlxuICogICAgICAgICAgICAgICAtIHRva2VucyB7QXJyYXk8U3RyaW5nPn0gIGUuZyBbXCJmaXJzdE5hbWVcIiwgXCJsYXN0TmFtZVwiXVxuICovXG5leHBvcnRzLnBhcnNlID0gZnVuY3Rpb24odGV4dCkge1xuICBtYWtlUkVHKClcbiAgdmFyIHJhd0V4cHMgPSBleHBvcnRzLmdldFJhd0V4cHModGV4dClcbiAgdmFyIGV4cHJlc3Npb25zID0gW11cbiAgXy5lYWNoKHJhd0V4cHMsIGZ1bmN0aW9uKHJhd0V4cCkge1xuICAgIHZhciBleHAgPSBleHBvcnRzLmdldEV4cEZyb21SYXdFeHAocmF3RXhwKVxuICAgIHZhciBleHByZXNzaW9uID0ge1xuICAgICAgcmF3RXhwOiByYXdFeHAsXG4gICAgICBleHA6IGV4cCxcbiAgICAgIHRva2VuczogZXhwb3J0cy5wYXJzZVRva2VucyhleHApIFxuICAgIH1cbiAgICBleHByZXNzaW9ucy5wdXNoKGV4cHJlc3Npb24pXG4gIH0pXG4gIHJldHVybiBleHByZXNzaW9ucyBcbn1cblxuZXhwb3J0cy5wYXJzZVRva2VucyA9IGZ1bmN0aW9uKGV4cCkge1xuICAvLyBUT0RPOiBUbyBvcHRpbXplIHRoaXMgcmVndWxhciBleHByZXNzaW9uIHRvIGF2b2lkIHRoaXMgY2FzZTpcbiAgLy8gXCInSVxcJ20gJyArIG5hbWUoKVwiXG4gIHZhciBTVFJJTkdfUkVHID0gLygnW1xcc1xcU10qPycpfChcIltcXHNcXFNdKj9cIikvZ1xuICBleHAgPSBleHAucmVwbGFjZShTVFJJTkdfUkVHLCAnJylcbiAgdmFyIGNhbmRpZGF0ZXMgPSBleHAubWF0Y2goS0VZV09SRF9SRUcpIHx8IFtdXG4gIHZhciB0b2tlbnNNYXAgPSB7fVxuICB2YXIgdG9rZW5zID0gW11cbiAgXy5lYWNoKGNhbmRpZGF0ZXMsIGZ1bmN0aW9uKGNhbmRpZGF0ZSkge1xuICAgIGlmIChJR05PUkVfS0VZV09SRFNfUkVHLnRlc3QoY2FuZGlkYXRlKSkgcmV0dXJuXG4gICAgdG9rZW5zTWFwW2NhbmRpZGF0ZV0gPSAxXG4gIH0pXG4gIGZvcih2YXIga2V5IGluIHRva2Vuc01hcCkge1xuICAgIHRva2Vucy5wdXNoKGtleSlcbiAgfVxuICByZXR1cm4gdG9rZW5zXG59XG4gICAgXG5cbmV4cG9ydHMuZXhlYyA9IGZ1bmN0aW9uKGV4cHJlc3Npb24sIHZtKSB7XG4gIHZhciBhcmdzID0gW11cbiAgdmFyIHRva2VucyA9IGV4cHJlc3Npb24udG9rZW5zXG4gIF8uZWFjaCh0b2tlbnMsIGZ1bmN0aW9uKHRva2VuKSB7XG4gICAgYXJncy5wdXNoKHZtW3Rva2VuXSlcbiAgfSlcbiAgdmFyIGV4cCA9IFwicmV0dXJuIFwiICsgZXhwcmVzc2lvbi5leHAgKyBcIjtcIlxuICByZXR1cm4gKG5ldyBGdW5jdGlvbih0b2tlbnMsIGV4cCkpLmFwcGx5KHZtLCBhcmdzKVxufVxuXG5leHBvcnRzLnBhcnNlRGlyZWN0aXZlID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgdmFyIFNUUklOR19ESVJfUkVHID0gL15bXyRcXHddW18kXFx3XFxkXFxzXSokL1xuICB2YXIgdmFsdWUgPSBfLnRyaW0odmFsdWUpXG4gIGlmICh2YWx1ZS5sZW5ndGggPT09IDAgfHwgU1RSSU5HX0RJUl9SRUcudGVzdCh2YWx1ZSkpIHtcbiAgICByZXR1cm4gdmFsdWVcbiAgfSBlbHNlIHtcbiAgICB2YXIgcmV0ID0ge31cbiAgICBfLmVhY2godmFsdWUuc3BsaXQoXCIsXCIpLCBmdW5jdGlvbihtYXApIHtcbiAgICAgIHZhciBrdiA9IG1hcC5zcGxpdChcIjpcIilcbiAgICAgIHZhciBrZXkgPSBjbGVhblF1b3RlcyhfLnRyaW0oa3ZbMF0pKVxuICAgICAgdmFyIHZhbHVlID0gXy50cmltKGt2WzFdKVxuICAgICAgcmV0W2tleV0gPSB2YWx1ZVxuICAgIH0pXG4gICAgcmV0dXJuIHJldFxuICB9XG59XG5cbmZ1bmN0aW9uIGNsZWFuUXVvdGVzKHN0cikge1xuICB2YXIgUVVPVEVfUkVHID0gL1tcIiddL2dcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKFFVT1RFX1JFRywgXCJcIilcbn1cbm1ha2VSRUcoKSIsInZhciBvYnNlcmFibGUgPSByZXF1aXJlKFwiLi9vYnNlcmFibGVcIilcblxuZXhwb3J0cy5pc09ic2VyYWJsZSA9IGZ1bmN0aW9uKG9iaikge1xuICB2YXIgb2JqID0gb2JqLiQkXG4gIHJldHVybiAob2JqIGluc3RhbmNlb2Ygb2JzZXJhYmxlLk9ic2VyYWJsZUtleSkgfHxcbiAgICAgICAgIChvYmogaW5zdGFuY2VvZiBvYnNlcmFibGUuT2JzZXJhYmxlQXJyYXkpXG59XG5cbmV4cG9ydHMubWFwID0gZnVuY3Rpb24oYXJyLCBmbikge1xuICB2YXIgcmVzdWx0cyA9IFtdXG4gIGZvcih2YXIgaSA9IDAsIGxlbiA9IGFyci5sZW5ndGg7IGkgPCBsZW47aSArKykge1xuICAgIHJlc3VsdHMucHVzaChmbihhcnJbaV0pKVxuICB9XG4gIHJldHVybiByZXN1bHRzXG59XG5cbmV4cG9ydHMuaXNBcnJheSA9IGZ1bmN0aW9uKGFycikge1xuICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKGFycikgPT09ICdbb2JqZWN0IEFycmF5XSdcbn1cblxuZXhwb3J0cy5lYWNoID0gZnVuY3Rpb24oYXJyLCBmbikge1xuICBmb3IgKHZhciBpID0gMCwgbGVuID0gYXJyLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgZm4oYXJyW2ldKVxuICB9XG59XG5cbmV4cG9ydHMuaXNVbmRlZmluZWQgPSBmdW5jdGlvbihvYmopIHtcbiAgcmV0dXJuIG9iaiA9PT0gdm9pZCA2NjY7XG59XG5cbmV4cG9ydHMudHJpbSA9IGZ1bmN0aW9uKHN0cikge1xuICByZXR1cm4gc3RyLnJlcGxhY2UoLyheXFxzKyl8XFxzKyQvZywgXCJcIilcbn1cblxuLyoqXG4gKiBBZGQgc29tZSBpc1R5cGUgbWV0aG9kczogaXNBcmd1bWVudHMsIGlzRnVuY3Rpb24sIGlzU3RyaW5nLCBpc051bWJlciwgaXNEYXRlLCBpc1JlZ0V4cCwgaXNFcnJvci5cbiAqIHN0ZWFsIGZyb20gdW5kZXJzY29yZTogaHR0cDovL3VuZGVyc2NvcmVqcy5vcmcvZG9jcy91bmRlcnNjb3JlLmh0bWxcbiAqL1xuZXhwb3J0cy5lYWNoKFsnQXJndW1lbnRzJywgJ0Z1bmN0aW9uJywgJ1N0cmluZycsICdOdW1iZXInLCAnRGF0ZScsICdSZWdFeHAnLCAnRXJyb3InXSwgZnVuY3Rpb24obmFtZSkge1xuICBleHBvcnRzWydpcycgKyBuYW1lXSA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgJyArIG5hbWUgKyAnXSc7XG4gIH07XG59KTtcbiIsIi8vcmVxdWlyZShcIi4vc3BlY3Mvc2FtcGxlLmpzXCIpXG5yZXF1aXJlKFwiLi9zcGVjcy91dGlsLmpzXCIpXG5yZXF1aXJlKFwiLi9zcGVjcy9vYnNlcmFibGUuanNcIilcbnJlcXVpcmUoXCIuL3NwZWNzL3BhcnNlci5qc1wiKVxucmVxdWlyZShcIi4vc3BlY3MvYmluZGVyLmpzXCIpXG4iLCJ2YXIgYmluZGVyID0gcmVxdWlyZShcIi4uLy4uL3NyYy9iaW5kZXJcIilcblxuZGVzY3JpYmUoXCJUZXN0IGJpbmRlclwiLCBmdW5jdGlvbigpIHtcbiAgaXQoXCJHZXQgdG9rZW5zIGZyb20gZGlmZmVyZW50IGRpcmVjdGl2ZVwiLCBmdW5jdGlvbigpIHtcbiAgICBiaW5kZXIuZ2V0VG9rZW5zRnJvbURpcmVjdGl2ZShcInRva2VuIGluIHRva2Vuc1wiKVxuICAgICAgICAuc2hvdWxkLmJlLmRlZXAuZXF1YWwoW1widG9rZW5cIiwgXCJ0b2tlbnNcIl0pXG4gICAgYmluZGVyLmdldFRva2Vuc0Zyb21EaXJlY3RpdmUoe1xuICAgICAgICAgIFwiY29sb3JcIjogXCIncmVkJ1wiLFxuICAgICAgICAgIFwiJ2ZvbnQtc2l6ZSdcIjogXCJzaXplKCkgKyAncHgnXCIsXG4gICAgICAgICAgXCJuYW1lXCI6IFwiamVycnkoKVwiLFxuICAgICAgICAgIFwid2lkdGhcIjogXCJ3aWR0aCgpICsgJ3B4J1wiXG4gICAgICAgIH0pLnNob3VsZC5iZS5kZWVwLmVxdWFsKFtcInNpemVcIiwgXCJqZXJyeVwiLCBcIndpZHRoXCJdKVxuICB9KVxufSkiLCJ2YXIgb2JzZXJhYmxlID0gcmVxdWlyZShcIi4uLy4uL3NyYy9vYnNlcmFibGUuanNcIilcblxuZGVzY3JpYmUoXCJUZXN0IG9ic2VyYWJsZVwiLCBmdW5jdGlvbigpIHtcbiAgZGVzY3JpYmUoXCJUZXN0IG9ic2VyYWJsZSBzdHJpbmcgYXR0cmlidXRlXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBhdHRyID0gbnVsbDtcblxuICAgIGJlZm9yZShmdW5jdGlvbigpIHtcbiAgICAgIGF0dHIgPSBvYnNlcmFibGUoXCJpIGxvdmUgeW91XCIpXG4gICAgfSlcblxuICAgIGl0KFwiSW5pdGlhbGl6aW5nIGRlZmF1bHQgdmFsdWUgYW5kIGdldCBpdC5cIiwgZnVuY3Rpb24oKSB7XG4gICAgICBhdHRyKCkuc2hvdWxkLmJlLmVxdWFsKFwiaSBsb3ZlIHlvdVwiKVxuICAgIH0pXG5cbiAgICBpdChcIldhdGNoZXIgZnVuY3Rpb24gc2hvdWxkIGJlIGludm9rZWQgd2hlbiB2YWx1ZSBpcyBjaGFuZ2VkLlwiLCBmdW5jdGlvbigpIHtcbiAgICAgIHZhciB3YXRjaGVyID0gc2lub24uc3B5KClcbiAgICAgIGF0dHIuJCQud2F0Y2god2F0Y2hlcilcbiAgICAgIHZhciB2YWwgPSBcImkgbG92ZSB5b3UsIHRvb1wiXG4gICAgICBhdHRyKHZhbClcbiAgICAgIHdhdGNoZXIuc2hvdWxkLmhhdmUuYmVlbi5jYWxsZWRXaXRoKHZhbCwgdm9pZCA2NjYsIGF0dHIuJCQpXG4gICAgICB3YXRjaGVyLnNob3VsZC5oYXZlLmJlZW4uY2FsbGVkT25jZVxuICAgICAgYXR0cigpLnNob3VsZC5iZS5lcXVhbChcImkgbG92ZSB5b3UsIHRvb1wiKVxuICAgIH0pXG5cbiAgfSlcbn0pIiwidmFyIHBhcnNlciA9IHJlcXVpcmUoXCIuLi8uLi9zcmMvcGFyc2VyXCIpXG52YXIgY29uZmlnID0gcmVxdWlyZShcIi4uLy4uL3NyYy9jb25maWdcIilcblxuZGVzY3JpYmUoXCJUZXN0IHBhcnNlclwiLCBmdW5jdGlvbigpIHtcblxuICBpdChcIkdldCByYXcgZXhwcmVzc2lvbnMgZnJvbSB0ZXh0LlwiLCBmdW5jdGlvbigpIHtcbiAgICBwYXJzZXIuZ2V0UmF3RXhwcyhcIntmaXJzdE5hbWUgKyBsYXN0TmFtZX0gaXMgbXkge25hbWV9XCIpXG4gICAgICAgICAgLnNob3VsZC5iZS5kZWVwLmVxdWFsKFtcIntmaXJzdE5hbWUgKyBsYXN0TmFtZX1cIiwgXCJ7bmFtZX1cIl0pXG4gIH0pXG5cbiAgaXQoXCJHZXQgZXhwcmVzc2lvbiBvYmplY3RzIGZyb20gdGV4dC5cIiwgZnVuY3Rpb24oKSB7XG4gICAgcGFyc2VyLnBhcnNlKFwie25hbWUoKSA9PT0gdHJ1ZSA/IGdvb2QoKSArICd5ZSc6IGJhZCgpfVwiKVxuICAgICAgICAgIC5zaG91bGQuYmUuZGVlcC5lcXVhbChbe1xuICAgICAgICAgICAgcmF3RXhwOiBcIntuYW1lKCkgPT09IHRydWUgPyBnb29kKCkgKyAneWUnOiBiYWQoKX1cIixcbiAgICAgICAgICAgIGV4cDogXCJuYW1lKCkgPT09IHRydWUgPyBnb29kKCkgKyAneWUnOiBiYWQoKVwiLFxuICAgICAgICAgICAgdG9rZW5zOiBbXCJuYW1lXCIsIFwiZ29vZFwiLCBcImJhZFwiXVxuICAgICAgICAgIH1dKVxuICAgIHBhcnNlci5wYXJzZSgne25hbWUoKSArIFwiR29vZFxcJyBuYW1lIGlzIG15IGxvdmVcIn0nKVxuICAgICAgICAgIC5zaG91bGQuYmUuZGVlcC5lcXVhbChbe1xuICAgICAgICAgICAgcmF3RXhwOiAne25hbWUoKSArIFwiR29vZFxcJyBuYW1lIGlzIG15IGxvdmVcIn0nLFxuICAgICAgICAgICAgZXhwOiAnbmFtZSgpICsgXCJHb29kXFwnIG5hbWUgaXMgbXkgbG92ZVwiJyxcbiAgICAgICAgICAgIHRva2VuczogW1wibmFtZVwiXVxuICAgICAgICAgIH1dKVxuICAgIHBhcnNlci5wYXJzZShcIlRvZGF5IHRvdGFsQ291bnQgaXMge3BhcnNlRmxvYXQodG90YWxDb3VudCgpKSArICdIZWxsbyd9LCB7bmFtZX0gc2hvdWxkIG1ha2UgaXQuXCIpXG4gICAgICAgICAgLnNob3VsZC5iZS5kZWVwLmVxdWFsKFt7XG4gICAgICAgICAgICByYXdFeHA6IFwie3BhcnNlRmxvYXQodG90YWxDb3VudCgpKSArICdIZWxsbyd9XCIsXG4gICAgICAgICAgICBleHA6IFwicGFyc2VGbG9hdCh0b3RhbENvdW50KCkpICsgJ0hlbGxvJ1wiLFxuICAgICAgICAgICAgdG9rZW5zOiBbXCJ0b3RhbENvdW50XCJdXG4gICAgICAgICAgfSwge1xuICAgICAgICAgICAgcmF3RXhwOiBcIntuYW1lfVwiLFxuICAgICAgICAgICAgZXhwOiBcIm5hbWVcIixcbiAgICAgICAgICAgIHRva2VuczogW1wibmFtZVwiXVxuICAgICAgICAgIH1dKVxuICB9KVxuXG4gIGl0KFwiRXhlY3V0ZSBhbiBleHByZXNzaW9uLlwiLCBmdW5jdGlvbigpIHtcbiAgICBwYXJzZXIuZXhlYyh7XG4gICAgICBleHA6IFwidGhpcy5sdWN5ICsgbmFtZSgpICsgMVwiLFxuICAgICAgdG9rZW5zOiBbXCJuYW1lXCJdXG4gICAgfSwge1xuICAgICAgbmFtZTogZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBcIkplcnJ5IVwiXG4gICAgICB9LFxuICAgICAgbHVjeTogXCJnb29kXCJcbiAgICB9KS5zaG91bGQuYmUuZXF1YWwoXCJnb29kSmVycnkhMVwiKVxuICB9KVxuXG4gIGl0KFwiUGFyc2Ugd2l0aCBjdXN0b20gb3BlbiBhbmQgY2xvc2UgdGFnLlwiLCBmdW5jdGlvbigpIHtcbiAgICBjb25maWcub3BlblRhZyA9IFwie3tcIlxuICAgIGNvbmZpZy5jbG9zZVRhZyA9IFwifX1cIlxuICAgIHBhcnNlci5wYXJzZShcInt7bmFtZSgpID09PSB0cnVlID8gZ29vZCgpOiBiYWQoKX19XCIpXG4gICAgICAgICAgLnNob3VsZC5iZS5kZWVwLmVxdWFsKFt7XG4gICAgICAgICAgICByYXdFeHA6IFwie3tuYW1lKCkgPT09IHRydWUgPyBnb29kKCk6IGJhZCgpfX1cIixcbiAgICAgICAgICAgIGV4cDogXCJuYW1lKCkgPT09IHRydWUgPyBnb29kKCk6IGJhZCgpXCIsXG4gICAgICAgICAgICB0b2tlbnM6IFtcIm5hbWVcIiwgXCJnb29kXCIsIFwiYmFkXCJdXG4gICAgICAgICAgfV0pXG4gIH0pXG5cbiAgaXQoXCJQYXJzZSBzdHJpbmcgZGlyZWN0aXZlLlwiLCBmdW5jdGlvbigpIHtcbiAgICBwYXJzZXIucGFyc2VEaXJlY3RpdmUoXCJ1c2Vyc1wiKS5zaG91bGQuYmUuZXF1YWwoXCJ1c2Vyc1wiKVxuICAgIHBhcnNlci5wYXJzZURpcmVjdGl2ZShcInVzZXIgaW4gdXNlcnNcIikuc2hvdWxkLmJlLmVxdWFsKFwidXNlciBpbiB1c2Vyc1wiKVxuICB9KVxuXG4gIGl0KFwiUGFyc2Uga2V5LXZhbHVlIGRpcmVjdGl2ZS5cIiwgZnVuY3Rpb24oKSB7XG4gICAgcGFyc2VyLnBhcnNlRGlyZWN0aXZlKFwiY29sb3I6IHJlZCwgJ2ZvbnQtc2l6ZSc6ICcxMnB4J1wiKVxuICAgICAgICAgIC5zaG91bGQuYmUuZGVlcC5lcXVhbCh7XG4gICAgICAgICAgICBcImNvbG9yXCI6IFwicmVkXCIsXG4gICAgICAgICAgICBcImZvbnQtc2l6ZVwiOiBcIicxMnB4J1wiXG4gICAgICAgICAgfSlcbiAgfSlcblxuICBpdChcIlBhc2Ugb25seSBvbmUgdGltZVwiLCBmdW5jdGlvbigpIHtcbiAgICBwYXJzZXIucGFyc2VUb2tlbnMoXCJuYW1lICsgbmFtZSArIG5hbWUgKyBqZXJyeVwiKS5zaG91bGQuYmUuZGVlcC5lcXVhbChbXCJuYW1lXCIsIFwiamVycnlcIl0pXG4gIH0pXG59KSIsIl8gPSByZXF1aXJlKFwiLi4vLi4vc3JjL3V0aWwuanNcIilcblxuZGVzY3JpYmUoXCJUZXN0IHV0aWxzIGZ1bmN0aW9uc1wiLCBmdW5jdGlvbigpIHtcbiAgaXQoXCJtYXBcIiwgZnVuY3Rpb24oKSB7XG4gICAgdmFyIGFyciA9IFsxLCAyLCAzLCA0XVxuICAgIHZhciBuZXdBcnIgPSBfLm1hcChhcnIsIGZ1bmN0aW9uKHZhbCkge1xuICAgICAgcmV0dXJuIHZhbCAqIDJcbiAgICB9KVxuICAgIGZvcih2YXIgaSA9IDAsIGxlbiA9IGFyci5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgYXJyW2ldID0gYXJyW2ldICogMlxuICAgIH1cbiAgICBhcnIuc2hvdWxkLmJlLmRlZXAuZXF1YWwobmV3QXJyKVxuICB9KVxuICBpdChcInRyaW1cIiwgZnVuY3Rpb24oKSB7XG4gICAgXy50cmltKFwiIGkgbG92ZSB5b3UgICAgXCIpLnNob3VsZC5iZS5lcXVhbChcImkgbG92ZSB5b3VcIilcbiAgfSlcbn0pIl19
