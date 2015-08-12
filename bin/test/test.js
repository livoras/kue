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
var _ = exports

_.isObserable = function(obj) {
  var obj = obj.$$
  return (obj instanceof obserable.ObserableKey) ||
         (obj instanceof obserable.ObserableArray)
}

_.map = function(arr, fn) {
  var results = []
  for(var i = 0, len = arr.length; i < len;i ++) {
    results.push(fn(arr[i]))
  }
  return results
}

_.isArray = function(arr) {
  return Object.prototype.toString.call(arr) === '[object Array]'
}

_.each = function(arr, fn) {
  for (var i = 0, len = arr.length; i < len; i++) {
    fn(arr[i])
  }
}

_.isUndefined = function(obj) {
  return obj === void 666;
}

_.trim = function(str) {
  return str.replace(/(^\s+)|\s+$/g, "")
}

/**
 * Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
 * steal from underscore: http://underscorejs.org/docs/underscore.html
 */
_.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
  _['is' + name] = function(obj) {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9ub2RlX21vZHVsZXMvZ3VscC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL2JpbmRlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvY29uZmlnLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9kaXJlY3RpdmVzL2luZGV4LmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy9kb20uanMiLCIvVXNlcnMvTW9va0Nha2UvUHVibGljL2dpdC9rdWUvc3JjL29ic2VyYWJsZS5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS9zcmMvcGFyc2VyLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3NyYy91dGlsLmpzIiwiL1VzZXJzL01vb2tDYWtlL1B1YmxpYy9naXQva3VlL3Rlc3QvZmFrZV9hMzE0MDkwYy5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L3NwZWNzL2JpbmRlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L3NwZWNzL29ic2VyYWJsZS5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L3NwZWNzL3BhcnNlci5qcyIsIi9Vc2Vycy9Nb29rQ2FrZS9QdWJsaWMvZ2l0L2t1ZS90ZXN0L3NwZWNzL3V0aWwuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgY29uZmlnID0gcmVxdWlyZShcIi4vY29uZmlnXCIpXG52YXIgXyA9IHJlcXVpcmUoXCIuL3V0aWxcIilcbnZhciBwYXJzZXIgPSByZXF1aXJlKFwiLi9wYXJzZXJcIilcbnZhciBkaXJlY3RpdmVzID0gcmVxdWlyZShcIi4vZGlyZWN0aXZlc1wiKVxuXG5leHBvcnRzLmJpbmRUZXh0ID0gZnVuY3Rpb24odGV4dE5vZGUsIGt1ZSkge1xuICB2YXIgdm0gPSBrdWUudm1cbiAgdmFyIHRleHQgPSB0ZXh0Tm9kZS50ZXh0Q29udGVudCB8fCB0ZXh0Tm9kZS5ub2RlVmFsdWUgLy8gZnVjayBJRTcsIDhcbiAgdmFyIGV4cHJlc3Npb25zID0gcGFyc2VyLnBhcnNlKHRleHQpXG4gIGZ1bmN0aW9uIHdyaXRlUmVzdWx0KCkge1xuICAgIHZhciB0ZXh0VHBsID0gdGV4dFxuICAgIF8uZWFjaChleHByZXNzaW9ucywgZnVuY3Rpb24oZXhwcmVzc2lvbikge1xuICAgICAgdmFyIHJlc3VsdCA9IHBhcnNlci5leGVjKGV4cHJlc3Npb24sIHZtKVxuICAgICAgdGV4dFRwbCA9IHRleHRUcGwucmVwbGFjZShleHByZXNzaW9uLnJhd0V4cCwgcmVzdWx0KVxuICAgIH0pXG4gICAgaWYgKHRleHROb2RlLm5vZGVWYWx1ZSkge1xuICAgICAgdGV4dE5vZGUubm9kZVZhbHVlID0gdGV4dFRwbFxuICAgIH0gZWxzZSB7XG4gICAgICB0ZXh0Tm9kZS50ZXh0Tm9kZSA9IHRleHRUcGxcbiAgICB9XG4gIH1cbiAgd3JpdGVSZXN1bHQoKVxuICB3YXRjaEFsbFRva2VucyhleHByZXNzaW9ucywga3VlLCB3cml0ZVJlc3VsdClcbn1cblxuZnVuY3Rpb24gd2F0Y2hBbGxUb2tlbnMoZXhwcmVzc2lvbnMsIGt1ZSwgZm4pIHtcbiAgdmFyIHZtID0ga3VlLnZtXG4gIF8uZWFjaChleHByZXNzaW9ucywgZnVuY3Rpb24oZXhwcmVzc2lvbikge1xuICAgIF8uZWFjaChleHByZXNzaW9uLnRva2VucywgZnVuY3Rpb24odG9rZW4pIHtcbiAgICAgIHdhdGNoVG9rZW4odG9rZW4pXG4gICAgfSlcbiAgfSlcblxuICBmdW5jdGlvbiB3YXRjaFRva2VuKHRva2VuKSB7XG4gICAgdmFyIG9ic2VyYWJsZUtleSA9IHZtW3Rva2VuXVxuICAgIGlmIChfLmlzVW5kZWZpbmVkKG9ic2VyYWJsZUtleSkpIHJldHVyblxuICAgIGlmIChfLmlzT2JzZXJhYmxlKG9ic2VyYWJsZUtleSkpIHtcbiAgICAgIG9ic2VyYWJsZUtleS4kJC53YXRjaChmbilcbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0cy5iaW5kRGlyID0gZnVuY3Rpb24oYXR0ciwgbm9kZSwga3VlKSB7XG4gIHZhciBkaXJOYW1lID0gZ2V0RGlyTmFtZShhdHRyKVxuICBpZighZGlyTmFtZSkgcmV0dXJuXG4gIGlmKCFkaXJlY3RpdmVzW2Rpck5hbWVdKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRGlyZWN0aXZlXCIgKyBkaXJOYW1lICsgXCIgaXMgbm90IGZvdW5kLlwiKVxuICB9XG4gIHZhciBkaXJlY3RpdmUgPSBwYXJzZXIucGFyc2VEaXJlY3RpdmUoYXR0ci52YWx1ZSlcbiAgdmFyIHRva2VucyA9IGdldFRva2Vuc0Zyb21EaXJlY3RpdmUoZGlyZWN0aXZlKVxuICB2YXIgZGlyT2JqID0gZGlyZWN0aXZlc1tkaXJOYW1lXVxuICBkaXJPYmouYmluZChub2RlLCBhdHRyLCBrdWUpXG4gIF8uZWFjaCh0b2tlbnMsIGZ1bmN0aW9uKHRva2VuKSB7XG4gICAgdmFyIG9ic2VyYWJsZUtleSA9IGt1ZS52bVt0b2tlbl1cbiAgICBpZiAoXy5pc1VuZGVmaW5lZChvYnNlcmFibGVLZXkpKSByZXR1cm5cbiAgICBpZiAoXy5pc09ic2VyYWJsZShvYnNlcmFibGVLZXkpKSB7XG4gICAgICBvYnNlcmFibGVLZXkuJCQud2F0Y2goZnVuY3Rpb24obmV3VmFsLCBvbGRWYWwsIG9ic2VyYWJsZSkge1xuICAgICAgICBkaXJPYmoudXBkYXRlKG5vZGUsIGF0dHIsIGt1ZSlcbiAgICAgIH0pXG4gICAgfVxuICB9KVxufVxuXG5mdW5jdGlvbiBnZXRUb2tlbnNGcm9tRGlyZWN0aXZlKGRpcmVjdGl2ZSkge1xuICBpZiAoXy5pc1N0cmluZyhkaXJlY3RpdmUpKSB7XG4gICAgcmV0dXJuIHBhcnNlci5wYXJzZVRva2VucyhkaXJlY3RpdmUpXG4gIH0gZWxzZSB7XG4gICAgdmFyIGFsbFRva2VucyA9IFtdXG4gICAgZm9yIChrZXkgaW4gZGlyZWN0aXZlKSB7XG4gICAgICB2YXIgdG9rZW5zID0gcGFyc2VyLnBhcnNlVG9rZW5zKGRpcmVjdGl2ZVtrZXldKVxuICAgICAgYWxsVG9rZW5zLnB1c2guYXBwbHkoYWxsVG9rZW5zLCB0b2tlbnMpXG4gICAgfVxuICAgIHJldHVybiBhbGxUb2tlbnNcbiAgfVxufVxuXG5mdW5jdGlvbiBnZXREaXJOYW1lKGF0dHIpIHtcbiAgdmFyIERJUl9SRUcgPSBuZXcgUmVnRXhwKChcIl5cIiArIGNvbmZpZy5kaXJlY3RpdmVQcmVmaXggKyBcIi1cIiArIFwiKFtcXFxcd1xcXFxkXSspXCIpKVxuICB2YXIgcmVzdWx0cyA9IGF0dHIubmFtZS5tYXRjaChESVJfUkVHKVxuICBpZihyZXN1bHRzKSB7XG4gICAgcmV0dXJuIHJlc3VsdHNbMV1cbiAgfVxuICByZXR1cm4gdm9pZCA2NjZcbn1cblxuZXhwb3J0cy5nZXRUb2tlbnNGcm9tRGlyZWN0aXZlID0gZ2V0VG9rZW5zRnJvbURpcmVjdGl2ZSIsInZhciBjb25maWcgPSBleHBvcnRzXG5cbmNvbmZpZy5vcGVuVGFnID0gXCJ7XCJcbmNvbmZpZy5jbG9zZVRhZyA9IFwifVwiXG5jb25maWcuZGlyZWN0aXZlUHJlZml4ID0gXCJrXCJcbiIsInZhciAkID0gcmVxdWlyZShcIi4uL2RvbVwiKVxuXG5leHBvcnRzW1wic2hvd1wiXSA9IHtcbiAgYmluZDogZnVuY3Rpb24oZWxlLCBhdHRyLCBrdWUpIHtcbiAgICB0aGlzLnVwZGF0ZShlbGUsIGF0dHIsIGt1ZSlcbiAgfSxcbiAgdXBkYXRlOiBmdW5jdGlvbihlbGUsIGF0dHIsIGt1ZSkge1xuICAgICQoZWxlKS5jc3MoXCJkaXNwbGF5XCIsIGt1ZS52bVthdHRyLnZhbHVlXSgpID8gXCJibG9ja1wiOiBcIm5vbmVcIilcbiAgfVxufVxuIiwidmFyICQgPSBmdW5jdGlvbihkb20pIHtcbiAgcmV0dXJuIHtcbiAgICBlbDogZG9tLFxuICAgIGF0dHI6IGZ1bmN0aW9uKGF0dHIsIG5hbWUpIHtcbiAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgICAgIHJldHVybiB0aGlzLmVsLmdldEF0dHJpYnV0ZShhdHRyKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5lbC5zZXRBdHRyaWJ1dGUoYXR0ciwgbmFtZSlcbiAgICAgIH1cbiAgICB9LFxuICAgIGNzczogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDEpIHtcbiAgICAgICAgdGhpcy5lbC5zdHlsZVtrZXldXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLmVsLnN0eWxlW2tleV0gPSB2YWx1ZVxuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9ICQiLCJ2YXIgXyA9IHJlcXVpcmUoXCIuL3V0aWwuanNcIilcblxuZnVuY3Rpb24gT2JzZXJhYmxlS2V5KGF0dHIpIHtcbiAgdmFyIHRoYXQgPSB0aGlzXG4gIHRoaXMudmFsdWUgPSBhdHRyXG4gIHRoaXMud2F0Y2hlcnMgPSBbXVxuICBmdW5jdGlvbiBnZXRPclNldChhdHRyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0aGF0LnZhbHVlXG4gICAgfVxuICAgIHRoYXQub2xkVmFsdWUgPSB0aGlzLnZhbHVlXG4gICAgdGhhdC52YWx1ZSA9IGF0dHJcbiAgICB0aGF0Lm5vdGlmeSgpXG4gIH1cbiAgZ2V0T3JTZXQuJCQgPSB0aGF0XG4gIHJldHVybiBnZXRPclNldFxufVxuXG5PYnNlcmFibGVLZXkucHJvdG90eXBlLm5vdGlmeSA9IGZ1bmN0aW9uKCkge1xuICB2YXIgdGhhdCA9IHRoaXNcbiAgXy5lYWNoKHRoaXMud2F0Y2hlcnMsIGZ1bmN0aW9uKHdhdGNoZXIpIHtcbiAgICB3YXRjaGVyKHRoYXQudmFsdWUsIHRoYXQub2xkVmFsdWUsIHRoYXQpXG4gIH0pXG59XG5cbk9ic2VyYWJsZUtleS5wcm90b3R5cGUud2F0Y2ggPSBmdW5jdGlvbihmbikge1xuICB0aGlzLndhdGNoZXJzLnB1c2goZm4pXG59XG5cbmZ1bmN0aW9uIE9ic2VyYWJsZUFycmF5KGFycikge1xuICBcbn1cblxuZnVuY3Rpb24gb2JzZXJhYmxlKG9iaikge1xuICBpZiAoIV8uaXNBcnJheShvYmopKSB7XG4gICAgcmV0dXJuIG5ldyBPYnNlcmFibGVLZXkob2JqKVxuICB9IGVsc2Uge1xuICAgIHJldHVybiBuZXcgT2JzZXJhYmxlQXJyYXkob2JqKVxuICB9XG59XG5cbm9ic2VyYWJsZS5PYnNlcmFibGVLZXkgPSBPYnNlcmFibGVLZXlcbm9ic2VyYWJsZS5PYnNlcmFibGVBcnJheSA9IE9ic2VyYWJsZUFycmF5XG5cbm1vZHVsZS5leHBvcnRzID0gb2JzZXJhYmxlXG4iLCJ2YXIgY29uZmlnID0gcmVxdWlyZShcIi4vY29uZmlnXCIpXG52YXIgXyA9IHJlcXVpcmUoXCIuL3V0aWxcIilcblxudmFyIFNQRUNJQUxfQ0hBUlMgPSAvKFxcKlxcLlxcP1xcK1xcJFxcXlxcW1xcXVxcKFxcKVxce1xcfVxcfFxcXFxcXC8pL2dcbnZhciBvcGVuVGFnLCBjbG9zZVRhZywgRVhQX1JFRywgUkVNT1ZFX1JFR1xuXG5mdW5jdGlvbiBtYWtlUkVHKCkge1xuICBvcGVuVGFnID0gY29uZmlnLm9wZW5UYWcucmVwbGFjZShTUEVDSUFMX0NIQVJTLCBcIlxcXFwkMVwiKVxuICBjbG9zZVRhZyA9IGNvbmZpZy5jbG9zZVRhZy5yZXBsYWNlKFNQRUNJQUxfQ0hBUlMsIFwiXFxcXCQxXCIpXG5cbiAgRVhQX1JFRyA9IG5ldyBSZWdFeHAob3BlblRhZyArIFwiW1xcXFxTXFxcXHNdKz9cIiArIGNsb3NlVGFnLCAnZycpXG4gIFJFTU9WRV9SRUcgPSBuZXcgUmVnRXhwKG9wZW5UYWcgKyBcInxcIiArIGNsb3NlVGFnLCAnZycpXG59XG5cbmV4cG9ydHMuZ2V0UmF3RXhwcyA9IGZ1bmN0aW9uKHRleHQpIHtcbiAgdmFyIHJlc3VsdHMgPSB0ZXh0Lm1hdGNoKEVYUF9SRUcpIHx8IFtdXG4gIHJldHVybiByZXN1bHRzXG59XG5cbmV4cG9ydHMuZ2V0RXhwRnJvbVJhd0V4cCA9IGZ1bmN0aW9uKHJhd0V4cCkge1xuICByZXR1cm4gcmF3RXhwLnJlcGxhY2UoUkVNT1ZFX1JFRywgXCJcIilcbn1cblxuLyoqIFxuICogU3RlYWwgZnJvbSBWdWUuanM6IFxuICogaHR0cHM6Ly9naXRodWIuY29tL3l5eDk5MDgwMy92dWUvYmxvYi9kZXYvc3JjL3BhcnNlcnMvZXhwcmVzc2lvbi5qc1xuICovXG52YXIgS0VZV09SRF9SRUcgPSAvW19cXHddW18kXFx3XFxkXSsvZ1xudmFyIGlnbm9yZUtleXdvcmRzID1cbiAgJ01hdGgsRGF0ZSx0aGlzLHRydWUsZmFsc2UsbnVsbCx1bmRlZmluZWQsSW5maW5pdHksTmFOLCcgK1xuICAnaXNOYU4saXNGaW5pdGUsZGVjb2RlVVJJLGRlY29kZVVSSUNvbXBvbmVudCxlbmNvZGVVUkksJyArXG4gICdlbmNvZGVVUklDb21wb25lbnQscGFyc2VJbnQscGFyc2VGbG9hdCxpbidcbnZhciBJR05PUkVfS0VZV09SRFNfUkVHID0gXG4gIG5ldyBSZWdFeHAoJ14oJyArIGlnbm9yZUtleXdvcmRzLnJlcGxhY2UoLywvZywgJ1xcXFxifCcpICsgJ1xcXFxiKScpXG5cbi8qKlxuICogUGFyc2UgdGV4dCBhbmQgcmV0dXJuIGV4cHJlc3Npb25zLlxuICogQHBhcmFtIHtTdHJpbmd9IHRleHRcbiAqIEByZXR1cm4ge0FycmF5PE9iamVjdD59XG4gKiAgICAgICAgICAgICAgIC0gcmF3RXhwIHtTdHJpbmd9ICAgICAgICAgZS5nIFwie2ZpcnN0TmFtZSgpICsgbGFzdE5hbWUoKX1cIlxuICogICAgICAgICAgICAgICAtIGV4cCB7U3RyaW5nfSAgICAgICAgICAgIGUuZyBcImZpcnN0TmFtZSgpICsgbGFzdE5hbWUoKVwiXG4gKiAgICAgICAgICAgICAgIC0gdG9rZW5zIHtBcnJheTxTdHJpbmc+fSAgZS5nIFtcImZpcnN0TmFtZVwiLCBcImxhc3ROYW1lXCJdXG4gKi9cbmV4cG9ydHMucGFyc2UgPSBmdW5jdGlvbih0ZXh0KSB7XG4gIG1ha2VSRUcoKVxuICB2YXIgcmF3RXhwcyA9IGV4cG9ydHMuZ2V0UmF3RXhwcyh0ZXh0KVxuICB2YXIgZXhwcmVzc2lvbnMgPSBbXVxuICBfLmVhY2gocmF3RXhwcywgZnVuY3Rpb24ocmF3RXhwKSB7XG4gICAgdmFyIGV4cCA9IGV4cG9ydHMuZ2V0RXhwRnJvbVJhd0V4cChyYXdFeHApXG4gICAgdmFyIGV4cHJlc3Npb24gPSB7XG4gICAgICByYXdFeHA6IHJhd0V4cCxcbiAgICAgIGV4cDogZXhwLFxuICAgICAgdG9rZW5zOiBleHBvcnRzLnBhcnNlVG9rZW5zKGV4cCkgXG4gICAgfVxuICAgIGV4cHJlc3Npb25zLnB1c2goZXhwcmVzc2lvbilcbiAgfSlcbiAgcmV0dXJuIGV4cHJlc3Npb25zIFxufVxuXG5leHBvcnRzLnBhcnNlVG9rZW5zID0gZnVuY3Rpb24oZXhwKSB7XG4gIC8vIFRPRE86IFRvIG9wdGltemUgdGhpcyByZWd1bGFyIGV4cHJlc3Npb24gdG8gYXZvaWQgdGhpcyBjYXNlOlxuICAvLyBcIidJXFwnbSAnICsgbmFtZSgpXCJcbiAgdmFyIFNUUklOR19SRUcgPSAvKCdbXFxzXFxTXSo/Jyl8KFwiW1xcc1xcU10qP1wiKS9nXG4gIGV4cCA9IGV4cC5yZXBsYWNlKFNUUklOR19SRUcsICcnKVxuICB2YXIgY2FuZGlkYXRlcyA9IGV4cC5tYXRjaChLRVlXT1JEX1JFRykgfHwgW11cbiAgdmFyIHRva2Vuc01hcCA9IHt9XG4gIHZhciB0b2tlbnMgPSBbXVxuICBfLmVhY2goY2FuZGlkYXRlcywgZnVuY3Rpb24oY2FuZGlkYXRlKSB7XG4gICAgaWYgKElHTk9SRV9LRVlXT1JEU19SRUcudGVzdChjYW5kaWRhdGUpKSByZXR1cm5cbiAgICB0b2tlbnNNYXBbY2FuZGlkYXRlXSA9IDFcbiAgfSlcbiAgZm9yKHZhciBrZXkgaW4gdG9rZW5zTWFwKSB7XG4gICAgdG9rZW5zLnB1c2goa2V5KVxuICB9XG4gIHJldHVybiB0b2tlbnNcbn1cbiAgICBcblxuZXhwb3J0cy5leGVjID0gZnVuY3Rpb24oZXhwcmVzc2lvbiwgdm0pIHtcbiAgdmFyIGFyZ3MgPSBbXVxuICB2YXIgdG9rZW5zID0gZXhwcmVzc2lvbi50b2tlbnNcbiAgXy5lYWNoKHRva2VucywgZnVuY3Rpb24odG9rZW4pIHtcbiAgICBhcmdzLnB1c2godm1bdG9rZW5dKVxuICB9KVxuICB2YXIgZXhwID0gXCJyZXR1cm4gXCIgKyBleHByZXNzaW9uLmV4cCArIFwiO1wiXG4gIHJldHVybiAobmV3IEZ1bmN0aW9uKHRva2VucywgZXhwKSkuYXBwbHkodm0sIGFyZ3MpXG59XG5cbmV4cG9ydHMucGFyc2VEaXJlY3RpdmUgPSBmdW5jdGlvbih2YWx1ZSkge1xuICB2YXIgU1RSSU5HX0RJUl9SRUcgPSAvXltfJFxcd11bXyRcXHdcXGRcXHNdKiQvXG4gIHZhciB2YWx1ZSA9IF8udHJpbSh2YWx1ZSlcbiAgaWYgKHZhbHVlLmxlbmd0aCA9PT0gMCB8fCBTVFJJTkdfRElSX1JFRy50ZXN0KHZhbHVlKSkge1xuICAgIHJldHVybiB2YWx1ZVxuICB9IGVsc2Uge1xuICAgIHZhciByZXQgPSB7fVxuICAgIF8uZWFjaCh2YWx1ZS5zcGxpdChcIixcIiksIGZ1bmN0aW9uKG1hcCkge1xuICAgICAgdmFyIGt2ID0gbWFwLnNwbGl0KFwiOlwiKVxuICAgICAgdmFyIGtleSA9IGNsZWFuUXVvdGVzKF8udHJpbShrdlswXSkpXG4gICAgICB2YXIgdmFsdWUgPSBfLnRyaW0oa3ZbMV0pXG4gICAgICByZXRba2V5XSA9IHZhbHVlXG4gICAgfSlcbiAgICByZXR1cm4gcmV0XG4gIH1cbn1cblxuZnVuY3Rpb24gY2xlYW5RdW90ZXMoc3RyKSB7XG4gIHZhciBRVU9URV9SRUcgPSAvW1wiJ10vZ1xuICByZXR1cm4gc3RyLnJlcGxhY2UoUVVPVEVfUkVHLCBcIlwiKVxufVxubWFrZVJFRygpIiwidmFyIG9ic2VyYWJsZSA9IHJlcXVpcmUoXCIuL29ic2VyYWJsZVwiKVxudmFyIF8gPSBleHBvcnRzXG5cbl8uaXNPYnNlcmFibGUgPSBmdW5jdGlvbihvYmopIHtcbiAgdmFyIG9iaiA9IG9iai4kJFxuICByZXR1cm4gKG9iaiBpbnN0YW5jZW9mIG9ic2VyYWJsZS5PYnNlcmFibGVLZXkpIHx8XG4gICAgICAgICAob2JqIGluc3RhbmNlb2Ygb2JzZXJhYmxlLk9ic2VyYWJsZUFycmF5KVxufVxuXG5fLm1hcCA9IGZ1bmN0aW9uKGFyciwgZm4pIHtcbiAgdmFyIHJlc3VsdHMgPSBbXVxuICBmb3IodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuO2kgKyspIHtcbiAgICByZXN1bHRzLnB1c2goZm4oYXJyW2ldKSlcbiAgfVxuICByZXR1cm4gcmVzdWx0c1xufVxuXG5fLmlzQXJyYXkgPSBmdW5jdGlvbihhcnIpIHtcbiAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChhcnIpID09PSAnW29iamVjdCBBcnJheV0nXG59XG5cbl8uZWFjaCA9IGZ1bmN0aW9uKGFyciwgZm4pIHtcbiAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGFyci5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgIGZuKGFycltpXSlcbiAgfVxufVxuXG5fLmlzVW5kZWZpbmVkID0gZnVuY3Rpb24ob2JqKSB7XG4gIHJldHVybiBvYmogPT09IHZvaWQgNjY2O1xufVxuXG5fLnRyaW0gPSBmdW5jdGlvbihzdHIpIHtcbiAgcmV0dXJuIHN0ci5yZXBsYWNlKC8oXlxccyspfFxccyskL2csIFwiXCIpXG59XG5cbi8qKlxuICogQWRkIHNvbWUgaXNUeXBlIG1ldGhvZHM6IGlzQXJndW1lbnRzLCBpc0Z1bmN0aW9uLCBpc1N0cmluZywgaXNOdW1iZXIsIGlzRGF0ZSwgaXNSZWdFeHAsIGlzRXJyb3IuXG4gKiBzdGVhbCBmcm9tIHVuZGVyc2NvcmU6IGh0dHA6Ly91bmRlcnNjb3JlanMub3JnL2RvY3MvdW5kZXJzY29yZS5odG1sXG4gKi9cbl8uZWFjaChbJ0FyZ3VtZW50cycsICdGdW5jdGlvbicsICdTdHJpbmcnLCAnTnVtYmVyJywgJ0RhdGUnLCAnUmVnRXhwJywgJ0Vycm9yJ10sIGZ1bmN0aW9uKG5hbWUpIHtcbiAgX1snaXMnICsgbmFtZV0gPSBmdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0ICcgKyBuYW1lICsgJ10nO1xuICB9O1xufSk7XG4iLCIvL3JlcXVpcmUoXCIuL3NwZWNzL3NhbXBsZS5qc1wiKVxucmVxdWlyZShcIi4vc3BlY3MvdXRpbC5qc1wiKVxucmVxdWlyZShcIi4vc3BlY3Mvb2JzZXJhYmxlLmpzXCIpXG5yZXF1aXJlKFwiLi9zcGVjcy9wYXJzZXIuanNcIilcbnJlcXVpcmUoXCIuL3NwZWNzL2JpbmRlci5qc1wiKVxuIiwidmFyIGJpbmRlciA9IHJlcXVpcmUoXCIuLi8uLi9zcmMvYmluZGVyXCIpXG5cbmRlc2NyaWJlKFwiVGVzdCBiaW5kZXJcIiwgZnVuY3Rpb24oKSB7XG4gIGl0KFwiR2V0IHRva2VucyBmcm9tIGRpZmZlcmVudCBkaXJlY3RpdmVcIiwgZnVuY3Rpb24oKSB7XG4gICAgYmluZGVyLmdldFRva2Vuc0Zyb21EaXJlY3RpdmUoXCJ0b2tlbiBpbiB0b2tlbnNcIilcbiAgICAgICAgLnNob3VsZC5iZS5kZWVwLmVxdWFsKFtcInRva2VuXCIsIFwidG9rZW5zXCJdKVxuICAgIGJpbmRlci5nZXRUb2tlbnNGcm9tRGlyZWN0aXZlKHtcbiAgICAgICAgICBcImNvbG9yXCI6IFwiJ3JlZCdcIixcbiAgICAgICAgICBcIidmb250LXNpemUnXCI6IFwic2l6ZSgpICsgJ3B4J1wiLFxuICAgICAgICAgIFwibmFtZVwiOiBcImplcnJ5KClcIixcbiAgICAgICAgICBcIndpZHRoXCI6IFwid2lkdGgoKSArICdweCdcIlxuICAgICAgICB9KS5zaG91bGQuYmUuZGVlcC5lcXVhbChbXCJzaXplXCIsIFwiamVycnlcIiwgXCJ3aWR0aFwiXSlcbiAgfSlcbn0pIiwidmFyIG9ic2VyYWJsZSA9IHJlcXVpcmUoXCIuLi8uLi9zcmMvb2JzZXJhYmxlLmpzXCIpXG5cbmRlc2NyaWJlKFwiVGVzdCBvYnNlcmFibGVcIiwgZnVuY3Rpb24oKSB7XG4gIGRlc2NyaWJlKFwiVGVzdCBvYnNlcmFibGUgc3RyaW5nIGF0dHJpYnV0ZVwiLCBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXR0ciA9IG51bGw7XG5cbiAgICBiZWZvcmUoZnVuY3Rpb24oKSB7XG4gICAgICBhdHRyID0gb2JzZXJhYmxlKFwiaSBsb3ZlIHlvdVwiKVxuICAgIH0pXG5cbiAgICBpdChcIkluaXRpYWxpemluZyBkZWZhdWx0IHZhbHVlIGFuZCBnZXQgaXQuXCIsIGZ1bmN0aW9uKCkge1xuICAgICAgYXR0cigpLnNob3VsZC5iZS5lcXVhbChcImkgbG92ZSB5b3VcIilcbiAgICB9KVxuXG4gICAgaXQoXCJXYXRjaGVyIGZ1bmN0aW9uIHNob3VsZCBiZSBpbnZva2VkIHdoZW4gdmFsdWUgaXMgY2hhbmdlZC5cIiwgZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgd2F0Y2hlciA9IHNpbm9uLnNweSgpXG4gICAgICBhdHRyLiQkLndhdGNoKHdhdGNoZXIpXG4gICAgICB2YXIgdmFsID0gXCJpIGxvdmUgeW91LCB0b29cIlxuICAgICAgYXR0cih2YWwpXG4gICAgICB3YXRjaGVyLnNob3VsZC5oYXZlLmJlZW4uY2FsbGVkV2l0aCh2YWwsIHZvaWQgNjY2LCBhdHRyLiQkKVxuICAgICAgd2F0Y2hlci5zaG91bGQuaGF2ZS5iZWVuLmNhbGxlZE9uY2VcbiAgICAgIGF0dHIoKS5zaG91bGQuYmUuZXF1YWwoXCJpIGxvdmUgeW91LCB0b29cIilcbiAgICB9KVxuXG4gIH0pXG59KSIsInZhciBwYXJzZXIgPSByZXF1aXJlKFwiLi4vLi4vc3JjL3BhcnNlclwiKVxudmFyIGNvbmZpZyA9IHJlcXVpcmUoXCIuLi8uLi9zcmMvY29uZmlnXCIpXG5cbmRlc2NyaWJlKFwiVGVzdCBwYXJzZXJcIiwgZnVuY3Rpb24oKSB7XG5cbiAgaXQoXCJHZXQgcmF3IGV4cHJlc3Npb25zIGZyb20gdGV4dC5cIiwgZnVuY3Rpb24oKSB7XG4gICAgcGFyc2VyLmdldFJhd0V4cHMoXCJ7Zmlyc3ROYW1lICsgbGFzdE5hbWV9IGlzIG15IHtuYW1lfVwiKVxuICAgICAgICAgIC5zaG91bGQuYmUuZGVlcC5lcXVhbChbXCJ7Zmlyc3ROYW1lICsgbGFzdE5hbWV9XCIsIFwie25hbWV9XCJdKVxuICB9KVxuXG4gIGl0KFwiR2V0IGV4cHJlc3Npb24gb2JqZWN0cyBmcm9tIHRleHQuXCIsIGZ1bmN0aW9uKCkge1xuICAgIHBhcnNlci5wYXJzZShcIntuYW1lKCkgPT09IHRydWUgPyBnb29kKCkgKyAneWUnOiBiYWQoKX1cIilcbiAgICAgICAgICAuc2hvdWxkLmJlLmRlZXAuZXF1YWwoW3tcbiAgICAgICAgICAgIHJhd0V4cDogXCJ7bmFtZSgpID09PSB0cnVlID8gZ29vZCgpICsgJ3llJzogYmFkKCl9XCIsXG4gICAgICAgICAgICBleHA6IFwibmFtZSgpID09PSB0cnVlID8gZ29vZCgpICsgJ3llJzogYmFkKClcIixcbiAgICAgICAgICAgIHRva2VuczogW1wibmFtZVwiLCBcImdvb2RcIiwgXCJiYWRcIl1cbiAgICAgICAgICB9XSlcbiAgICBwYXJzZXIucGFyc2UoJ3tuYW1lKCkgKyBcIkdvb2RcXCcgbmFtZSBpcyBteSBsb3ZlXCJ9JylcbiAgICAgICAgICAuc2hvdWxkLmJlLmRlZXAuZXF1YWwoW3tcbiAgICAgICAgICAgIHJhd0V4cDogJ3tuYW1lKCkgKyBcIkdvb2RcXCcgbmFtZSBpcyBteSBsb3ZlXCJ9JyxcbiAgICAgICAgICAgIGV4cDogJ25hbWUoKSArIFwiR29vZFxcJyBuYW1lIGlzIG15IGxvdmVcIicsXG4gICAgICAgICAgICB0b2tlbnM6IFtcIm5hbWVcIl1cbiAgICAgICAgICB9XSlcbiAgICBwYXJzZXIucGFyc2UoXCJUb2RheSB0b3RhbENvdW50IGlzIHtwYXJzZUZsb2F0KHRvdGFsQ291bnQoKSkgKyAnSGVsbG8nfSwge25hbWV9IHNob3VsZCBtYWtlIGl0LlwiKVxuICAgICAgICAgIC5zaG91bGQuYmUuZGVlcC5lcXVhbChbe1xuICAgICAgICAgICAgcmF3RXhwOiBcIntwYXJzZUZsb2F0KHRvdGFsQ291bnQoKSkgKyAnSGVsbG8nfVwiLFxuICAgICAgICAgICAgZXhwOiBcInBhcnNlRmxvYXQodG90YWxDb3VudCgpKSArICdIZWxsbydcIixcbiAgICAgICAgICAgIHRva2VuczogW1widG90YWxDb3VudFwiXVxuICAgICAgICAgIH0sIHtcbiAgICAgICAgICAgIHJhd0V4cDogXCJ7bmFtZX1cIixcbiAgICAgICAgICAgIGV4cDogXCJuYW1lXCIsXG4gICAgICAgICAgICB0b2tlbnM6IFtcIm5hbWVcIl1cbiAgICAgICAgICB9XSlcbiAgfSlcblxuICBpdChcIkV4ZWN1dGUgYW4gZXhwcmVzc2lvbi5cIiwgZnVuY3Rpb24oKSB7XG4gICAgcGFyc2VyLmV4ZWMoe1xuICAgICAgZXhwOiBcInRoaXMubHVjeSArIG5hbWUoKSArIDFcIixcbiAgICAgIHRva2VuczogW1wibmFtZVwiXVxuICAgIH0sIHtcbiAgICAgIG5hbWU6IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gXCJKZXJyeSFcIlxuICAgICAgfSxcbiAgICAgIGx1Y3k6IFwiZ29vZFwiXG4gICAgfSkuc2hvdWxkLmJlLmVxdWFsKFwiZ29vZEplcnJ5ITFcIilcbiAgfSlcblxuICBpdChcIlBhcnNlIHdpdGggY3VzdG9tIG9wZW4gYW5kIGNsb3NlIHRhZy5cIiwgZnVuY3Rpb24oKSB7XG4gICAgY29uZmlnLm9wZW5UYWcgPSBcInt7XCJcbiAgICBjb25maWcuY2xvc2VUYWcgPSBcIn19XCJcbiAgICBwYXJzZXIucGFyc2UoXCJ7e25hbWUoKSA9PT0gdHJ1ZSA/IGdvb2QoKTogYmFkKCl9fVwiKVxuICAgICAgICAgIC5zaG91bGQuYmUuZGVlcC5lcXVhbChbe1xuICAgICAgICAgICAgcmF3RXhwOiBcInt7bmFtZSgpID09PSB0cnVlID8gZ29vZCgpOiBiYWQoKX19XCIsXG4gICAgICAgICAgICBleHA6IFwibmFtZSgpID09PSB0cnVlID8gZ29vZCgpOiBiYWQoKVwiLFxuICAgICAgICAgICAgdG9rZW5zOiBbXCJuYW1lXCIsIFwiZ29vZFwiLCBcImJhZFwiXVxuICAgICAgICAgIH1dKVxuICB9KVxuXG4gIGl0KFwiUGFyc2Ugc3RyaW5nIGRpcmVjdGl2ZS5cIiwgZnVuY3Rpb24oKSB7XG4gICAgcGFyc2VyLnBhcnNlRGlyZWN0aXZlKFwidXNlcnNcIikuc2hvdWxkLmJlLmVxdWFsKFwidXNlcnNcIilcbiAgICBwYXJzZXIucGFyc2VEaXJlY3RpdmUoXCJ1c2VyIGluIHVzZXJzXCIpLnNob3VsZC5iZS5lcXVhbChcInVzZXIgaW4gdXNlcnNcIilcbiAgfSlcblxuICBpdChcIlBhcnNlIGtleS12YWx1ZSBkaXJlY3RpdmUuXCIsIGZ1bmN0aW9uKCkge1xuICAgIHBhcnNlci5wYXJzZURpcmVjdGl2ZShcImNvbG9yOiByZWQsICdmb250LXNpemUnOiAnMTJweCdcIilcbiAgICAgICAgICAuc2hvdWxkLmJlLmRlZXAuZXF1YWwoe1xuICAgICAgICAgICAgXCJjb2xvclwiOiBcInJlZFwiLFxuICAgICAgICAgICAgXCJmb250LXNpemVcIjogXCInMTJweCdcIlxuICAgICAgICAgIH0pXG4gIH0pXG5cbiAgaXQoXCJQYXNlIG9ubHkgb25lIHRpbWVcIiwgZnVuY3Rpb24oKSB7XG4gICAgcGFyc2VyLnBhcnNlVG9rZW5zKFwibmFtZSArIG5hbWUgKyBuYW1lICsgamVycnlcIikuc2hvdWxkLmJlLmRlZXAuZXF1YWwoW1wibmFtZVwiLCBcImplcnJ5XCJdKVxuICB9KVxufSkiLCJfID0gcmVxdWlyZShcIi4uLy4uL3NyYy91dGlsLmpzXCIpXG5cbmRlc2NyaWJlKFwiVGVzdCB1dGlscyBmdW5jdGlvbnNcIiwgZnVuY3Rpb24oKSB7XG4gIGl0KFwibWFwXCIsIGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcnIgPSBbMSwgMiwgMywgNF1cbiAgICB2YXIgbmV3QXJyID0gXy5tYXAoYXJyLCBmdW5jdGlvbih2YWwpIHtcbiAgICAgIHJldHVybiB2YWwgKiAyXG4gICAgfSlcbiAgICBmb3IodmFyIGkgPSAwLCBsZW4gPSBhcnIubGVuZ3RoOyBpIDwgbGVuOyBpKyspIHtcbiAgICAgIGFycltpXSA9IGFycltpXSAqIDJcbiAgICB9XG4gICAgYXJyLnNob3VsZC5iZS5kZWVwLmVxdWFsKG5ld0FycilcbiAgfSlcbiAgaXQoXCJ0cmltXCIsIGZ1bmN0aW9uKCkge1xuICAgIF8udHJpbShcIiBpIGxvdmUgeW91ICAgIFwiKS5zaG91bGQuYmUuZXF1YWwoXCJpIGxvdmUgeW91XCIpXG4gIH0pXG59KSJdfQ==
