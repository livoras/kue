var $ = require("../dom")

module.exports = {
  bind: function(ele, attr, component, dir) {
    var FUNCTION_CALL_REG = /([\S\s]+)(\([\S\s]+\))/
    var $ele = $(ele)
    for(var eventName in dir) {
      var extract = dir[eventName].match(FUNCTION_CALL_REG)
      var params = []
      if (extract) {
        var callName = extract[1]
        if (extract[2]) {
          params = extract[2]
            .replace(/[\(\)]/g, "")
            .split(",")
        }
      } else {
        var callName = dir[eventName]
      }
      ;(function(params, eventName) {
      console.log(callName, component)
      $ele.on(eventName, function(event) {
        console.log(eventName, params.length)
        if (params.length === 0) {
          // TODO
        } else {
          // TODO
        }
      })
      })(params, eventName)
    }
  }
}
