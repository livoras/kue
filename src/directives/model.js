var $ = require("../dom")

var fns = {}

fns["text"] = {
  bind: function(ele, attr, kue, dir) {
    this.update(ele, attr, kue, dir)
    $(ele).on("input", updateVM)
    $(ele).on("keyup", updateVM)
    function updateVM() {
      var vmName = dir.replace(/\(\)/g, "")
      kue.vm[vmName](ele.value)
    }
  },
  update: function(ele, attr, kue, dir) {
    var vmName = dir.replace(/\(\)/g, "")
    ele.value = kue.vm[vmName]()
  }
}

fns["checkbox"] = {
  bind: function(ele, attr, kue, dir) {
    var $ele = $(ele)
    this.update(ele, attr, kue, dir)
    $ele.on("click", function() {
      var vmName = dir.replace(/\(\)/g, "")
      if (ele.checked) {
        kue.vm[vmName](true)
      } else {
        kue.vm[vmName](false)
      }
    })
  },
  update: function(ele, attr, kue, dir) {
    var vmName = dir.replace(/\(\)/g, "")
    var $ele = $(ele)
    if (kue.vm[vmName]()) {
      $ele.attr("checked", "checked")
    } else {
      $ele.removeAttr("checked")
    }
  }
}

module.exports = {
  bind: function(ele, attr, kue, dir) {
    var type = $(ele).attr("type") || "text"
    fns[type].bind(ele, attr, kue, dir)
  },
  update: function(ele, attr, kue, dir) {
    var type = $(ele).attr("type") || "text"
    fns[type].update(ele, attr, kue, dir)
  }
}
