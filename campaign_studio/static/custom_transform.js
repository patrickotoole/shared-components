function runTransforms(transforms,values,cb) {
  var transform_funcs = transforms.reduce(function(p,c) { 
      if (c.eval) {
        p[c.name] = eval("[function(row) { row['" + c.name + "'] = " + c.eval + "}][0]"); 
      } 
      return p 
    },{})

  if (values.data) {
    var first_row = values.data[0]

    var transformCols = Object.keys(transform_funcs).filter(function(k) { return first_row[k] !== undefined })
      , transformCount = Object.keys(transform_funcs).length;

    if (transformCols.length == transformCount) return

    values.data.map(function(row) {
      Object.keys(transform_funcs).map(function(k) { 
        if (transform_funcs[k]) transform_funcs[k](row) 
      })
    })

    if (cb) cb(values)
  }

  return values
}

try {
  window.module = window.module || {}
} catch(e) {}

module.exports = {
 runTransforms: runTransforms
}
