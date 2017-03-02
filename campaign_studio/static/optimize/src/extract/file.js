export function Upload(target) {
  this._target = target
  this._on = {}
}

Upload.prototype = {
    draw: function() {

      var target = this._target;

      d3_updateable(target,"span","span").text("Upload a file: ")
    
      var input = d3_updateable(target,"input","input")
        .attr("type","file")
    
      campaign_analysis.upload(input)
      return this
    }
  , on: function(action,fn) {
      if (fn === undefined) return this._on[action] || function() {};
      this._on[action] = fn;
      return this
    }

}

export function upload(target) {
  return new Upload(target)
}
