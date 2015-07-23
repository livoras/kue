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