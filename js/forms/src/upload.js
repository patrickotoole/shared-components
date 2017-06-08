export function Upload(target) {
  this.target = target
  this._on = {}
  this.reader = new FileReader()

  var self = this;


  this.reader.addEventListener("load",this.parse.bind(this), false)

  this.target.on("change",function() {
    var file = this.files[0]
    self.reader.readAsText(file)
  })
}

Upload.prototype = {
    parse: function() {
      this.on("load")(this.reader.result)
    }
  , on: function(action,fn) {
      if (fn === undefined) return this._on[action] || function() {};
      this._on[action] = fn;
      return this
    } 
}

 
function upload(target) {
  return new Upload(target)
}

upload.prototype = Upload.prototype;
export default upload;
