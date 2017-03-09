import d3_wrapper_with_title from './helper';

export function Save(target) {
  this._target = target
  this._on = {}
}

function showableSection(target,key,option) {

  var option = option || "extract_type"
  
  return d3_updateable(target,"." + key).classed("showable hidden " + key,true)
    .classed("hidden",function(d) { return !(d[option] == key) })
}

Save.prototype = {
    draw: function() {
      d3_updateable(this._target,"span","span").text("Name:")
      var input = d3_updateable(this._target,"input","input")
        .on("update",this.on("update"))

      var save = d3_updateable(this._target,".save","button").classed("save",true)
        .text("Save")
        .on("click",this.on("save"))

      var create = d3_updateable(this._target,".create","button").classed("create",true)
        .text("Run")
        .on("click",this.on("run"))


    }
  , data: function(d) {
      if (d === undefined) return this._data
      this._data = d
      return this
    }

  , on: function(action,fn) {
      if (fn === undefined) return this._on[action] || function() {};
      this._on[action] = fn;
      return this
    }
}

function save(target) {
  return new Save(target)
}

save.prototype = Save.prototype

export default save;
