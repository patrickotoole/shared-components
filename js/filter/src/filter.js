import d3 from 'd3'

export function d3_updateable(target,selector,type,data,joiner) {
  var type = type || "div"
  var updateable = target.selectAll(selector).data(
    function(x){return data ? [data] : [x]},
    joiner || function(x){return [x]}
  )

  updateable.enter()
    .append(type)

  return updateable
}

export function d3_splat(target,selector,type,data,joiner) {
  var type = type || "div"
  var updateable = target.selectAll(selector).data(
    data || function(x){return x},
    joiner || function(x){return x}
  )

  updateable.enter()
    .append(type)

  return updateable
}


var typewatch = (function(){
  var timer = 0;
  return function(callback, ms){
    clearTimeout (timer);
    timer = setTimeout(callback, ms);
  };
})();

export function accessor(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val
  return this
}

export function Filter(target) {
  this._target = target
  this._data = false
  this._on = {}
  this._render_op = {}
  this._fields = []
  this._ops = []
}

export default function filter(target) {
  return new Filter(target)
}

Filter.prototype = {
    draw: function() {

      var wrap = d3_updateable(this._target,".filters-wrapper","div",this.data(),function() { return 1})
        .classed("filters-wrapper",true)
        .style("padding-left", "10px")
        .style("padding-right", "20px")

      var filters = d3_updateable(wrap,".filters","div",false,function(x) { return 1})
        .classed("filters",true)
      
      var filter = d3_splat(filters,".filter","div",function(x) { return x },function(x,i) { return i + x.field })
        .classed("filter",true)
        .style("line-height","33px")

      filter.exit().remove()
      
      var self = this;
      filter.each(function(v,pos) {
        var dthis = d3.select(this)
        self.filterRow(dthis, self._fields, self._ops, v)
      })
      
      this.filterFooter(wrap)

      return this
      
    }
  , ops: function(d) {
      if (d === undefined) return this._ops
      this._ops = d
      return this
    }
  , fields: function(d) {
      if (d === undefined) return this._fields
      this._fields = d
      return this
    }
  , data: function(d) {
      if (d === undefined) return this._data
      this._data = d
      return this
  	}
  , text: function(fn) {
      if (fn === undefined) return this._fn || function(x){ return x.key }
      this._fn = fn
      return this
    }
  , render_op: function(op,fn) {
      if (fn === undefined) return this._render_op[op] || function() {};
      this._render_op[op] = fn;
      return this
    }

  , on: function(action,fn) {
      if (fn === undefined) return this._on[action] || function() {};
      this._on[action] = fn;
      return this
    }
  , buildOp: function(obj) {
      var op = obj.op
        , field = obj.field
        , value = obj.value;
    
      if ( [op,field,value].indexOf(undefined) > -1) return function() {return true}
    
      return this._ops[op](field, value)
    }
  , filterRow: function(_filter, fields, ops, value) {
    
      var self = this

      var remove = d3_updateable(_filter,".remove","a")
        .classed("remove",true)
        .style("float","right")
        .style("font-weight","bold")
        .html("&#10005;")
        .on("click",function(x) {
          var new_data = self.data().filter(function(f) { return f !== x })
          self.data(new_data)
          self.draw()
          self.on("update")(self.data())

        })

      var filter = d3_updateable(_filter,".inner","div")
        .classed("inner",true)


      var select = d3_updateable(filter,"select.field","select",fields)
        .classed("field",true)
        .style("width","165px")
        .on("change", function(x,i) {
          value.field = this.selectedOptions[0].__data__
          
          var pos = 0
          fields.map(function(x,i) {
            if (x == value.field) pos = i
          })

          var selected = ops[pos].filter(function(x) { return x.key == value.op })
          if (selected.length == 0) value.op = ops[pos][0].key
          //value.fn = self.buildOp(value)
          self.on("update")(self.data())

          
          
          self.drawOps(filter, ops[pos], value, pos)
        })
      
      d3_updateable(select,"option","option")
        .property("disabled" ,true)
        .property("hidden", true)
        .text("Filter...")

      
      d3_splat(select,"option","option")
        .text(function(x) { return x })
        .attr("selected", function(x) { return x == value.field ? "selected" : undefined })

      if (value.op && value.field && value.value) {
debugger
        var pos = fields.indexOf(value.field)
        self.drawOps(filter, ops[pos], value, pos)
      }


    }
  , drawOps: function(filter, ops, value) {

      

      var self = this;

      var select = d3_updateable(filter,"select.op","select",false, function(x) {return 1})
        .classed("op",true)
        .style("width","100px")
        .style("margin-left","10px")
        .style("margin-right","10px")
        .on("change", function(x){
          value.op = this.selectedOptions[0].__data__.key
          //value.fn = self.buildOp(value)
          self.on("update")(self.data())
          self.drawInput(filter, value, value.op)
        })

      //var dflt = [{"key":"Select Operation...","disabled":true,"hidden":true}]

      var new_ops = ops //dflt.concat(ops)

      value.op = value.op || new_ops[0].key

      var ops = d3_splat(select,"option","option",new_ops,function(x){return x.key})
        .text(function(x) { return x.key.split(".")[0] }) 
        .attr("selected", function(x) { return x.key == value.op ? "selected" : undefined })

      ops.exit().remove()
      self.drawInput(filter, value, value.op)

    }
  , drawInput: function(filter, value, op) {

      var self = this

      filter.selectAll(".value").remove()
      var r = this._render_op[op]

      if (r) {
        return r.bind(this)(filter,value)
      }

      d3_updateable(filter,"input.value","input")
        .classed("value",true)
        .style("padding-left","10px")
        .style("width","150px")
        .style("line-height","1em")

        .attr("value", value.value)
        .on("keyup", function(x){
          var t = this
        
          typewatch(function() {
            value.value = t.value
            //value.fn = self.buildOp(value)
            self.on("update")(self.data())
          },1000)
        })
    
    }
  , filterFooter: function(wrap) {
      var footer = d3_updateable(wrap,".filter-footer","div",false,function(x) { return 1})
        .classed("filter-footer",true)
        .style("margin-bottom","15px")
        .style("margin-top","10px")


      var self = this
      
      d3_updateable(footer,".add","a",false,function(x) { return 1})
        .classed("add",true)
        .style("font-weight","bold")
        .html("&#65291;")
        .style("width","24px")
        .style("height","24px")
        .style("line-height","24px")
        .style("text-align","center")
        .style("border-radius","15px")
        .style("border","1.5px solid #428BCC")
        .style("cursor","pointer")
        .style("display","inline-block")

        .on("click",function(x) {
        
          var d = self._data
          if (d.length == 0 || Object.keys(d.slice(-1)).length > 0) d.push({})
          self.draw()
            
        })
    }
  , typewatch: typewatch
}
