export function NewForm(target) {
  var self = this
  this._target = target
  this._on = {
      add: function(x) {
        var data = self.data()
        if (data.fields.filter(function(x) { return x.name === undefined }).length) return 

        data.fields.push({})
        self.data(data).draw()
      }
    , create: function(x) {
        console.log(self.data())
      }
  }
  
}

NewForm.prototype = {
    data: function(d) {
      if (d === undefined) return this._data
      this._data = d
      return this
    }
  , draw: function() {

      var self = this;

      var form = d3_updateable(this._target,".build-form","div", this.data() )
        .classed("build-form",true)

      var name_row = d3_updateable(form,".form-name-row","div")
        .classed("form-name-row row",true)

      d3_updateable(name_row,"span","span")
        .text("Form name: ")

      d3_updateable(name_row,"input","input")
        .attr("value",function(x) { return x.name })
        .on("change",function(x) {
          x.name = this.value
        })

      var script_row = d3_updateable(form,".script-name-row","div")
        .classed("script-name-row row",true)

      d3_updateable(script_row,"span","span")
        .text("Script name: ")

      d3_updateable(script_row,"input","input")
        .attr("value",function(x) { return x.name })
        .on("change",function(x) {
          x.script = this.value
        })


      var description_row = d3_updateable(form,".form-description-row","div")
        .classed("form-description-row row",true)

      d3_updateable(description_row,"span","span")
        .text("Form description: ")

      d3_updateable(description_row,"textarea","textarea")
        .attr("value",function(x) { return x.description })
        .on("change",function(x) {
          x.description = this.value
        })

      d3_updateable(form,"hr","hr")






      var rows = d3_splat(form,".row","div",function(x) { return x.fields }, function(x) { return x.name })
        .classed("row",true)
      
      var field_label = d3_updateable(rows,".field-label","span")
        .classed("field-label",true)
        .text("Field name: ")

      d3_updateable(field_label,"input","input")
        .attr("value",function(x) { return x.name })
        .on("change",function(x) {
          x.name = this.value
        })

      var field_type = d3_updateable(rows,".field-type","span")
        .classed("field-type",true)
        .text("Field type: ")

      var select_type = d3_updateable(field_type,"select","select")
        .attr("value",function(x) { return x.type})
        .on("change",function(x) {
          x.type = this.selectedOptions[0].__data__
        })

      d3_splat(select_type,"option","option",["input","select","textarea"])
        .attr("selected", function(x) { return this.parentNode.__data__.type == x ? "selected" : undefined })
        .text(String)

      var field_default = d3_updateable(rows,".field-default-select","span")
        .classed("field-default-select",true)
        .text("Field default: ")

      var select_default = d3_updateable(field_default,"select","select")
        .attr("value",function(x) { return x.default})
        .on("change",function(x) {
          x.default_type = this.selectedOptions[0].__data__
        })

      d3_splat(select_default,"option","option",["none","text","json","sql"])
        .attr("selected", function(x) { return this.parentNode.__data__.default == x ? "selected" : undefined })
        .text(String)



      var field_defaults = d3_updateable(rows,".field-default","span")
        .classed("field-default",true)
        .text("Default: ")

      d3_updateable(field_defaults,"textarea","textarea")
        .attr("rows",1)
        .text(function(x) { return x.default_value })
        .on("change",function(x) { 
          x.default_value = this.value
        })

      var field_defaults = d3_updateable(rows,".field-description","span")
        .classed("field-description",true)
        .text("Description: ")

      d3_updateable(field_defaults,"textarea","textarea")
        .attr("rows",1)
        .text(function(x) { return x.description })
        .on("change",function(x) { 
          x.description = this.value
        })






      var add_row = d3_updateable(this._target,".add-row","div")
        .classed("add-row",true)

      d3_updateable(add_row,"button","button")
        .text("Add row")
        .on("click",this.on("add"))

      var create_row = d3_updateable(this._target,".create-row","div")
        .classed("create-row",true)

      d3_updateable(create_row,"button","button")
        .style("margin-top","10px")
        .text("Create")
        .on("click",function(x) { self.on("create")(self.data()) })

      return this
    }
  , on: function(action,fn) {
      if (fn === undefined) return this._on[action] || function() {};
      this._on[action] = fn;
      return this
    }
  , summarize: function() {
      var values = this._target.selectAll(".row")[0].map(function(arg) {

        var data = arg.__data__

        return { "name": data.name, "value": data.value, "type": data.type }
      })

      return values
    } 
}

function new_form(target) {
  return new NewForm(target)
}

new_form.prototype = NewForm.prototype

export default new_form;

