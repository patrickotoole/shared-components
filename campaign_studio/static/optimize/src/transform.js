import d3_wrapper_with_title from './helper';

export function Transform(target) {
  this._target = target
  this._on = {}
}

Transform.prototype = {
    draw: function() {
      var transform_wrap = d3_wrapper_with_title(this._target,"Transform","transform",this._data)
      var filter_wrap = d3_wrapper_with_title(this._target,"Filter","filter",this._data)


      var transform = d3_splat(transform_wrap,".transform-item","div",function(x) { return x }, function(x,i) { return x.name })
        .classed("transform-item",true)
        .style("margin-left","10px")

      transform.exit().remove()

      d3_updateable(transform_wrap,"button.add","button")
        .classed("add",true)
        .text("Add Transform")
        .on("click",this.on("new"))

      //d3_updateable(transform_wrap,"button.submit","button")
      //  .classed("submit",true)
      //  .text("Run Transform")
      //  .on("click",this.on("submit"))




      var name_wrap = d3_class(transform,"name-wrap")
        .style("display","inline-block")

      d3_updateable(name_wrap,"span","span").text("New Column Name:")
      d3_updateable(name_wrap,"input","input").attr("value",function(x){ return x.name })
        .attr("placeholder","e.g., CPM")
        .on("change",(x) => {
          var items = this.summarize()
          this.on("change")(items)
        })

      var eval_wrap = d3_updateable(transform,".eval-wrap","div")
        .classed("eval-wrap",true)
        .style("display","inline-block")

      d3_updateable(eval_wrap,"span","span").text("Expression:")
      d3_updateable(eval_wrap,"input","input").attr("value",function(x){ return x.eval })
        .attr("placeholder","e.g., row['imps']/row['cost']")
        .on("change",(x) => {
          var items = this.summarize()
          this.on("change")(items)
        })

    }
  , summarize: function() {
      var items = []
      this._target.selectAll(".transform")
        .selectAll(".transform-item")
        .each(function(x) {
          var input = d3.select(this).selectAll("input")
          items.push({
              name: input[0][0].value
            , eval: input[0][1].value
          })

        })

      return items
        
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

function transform(target) {
  return new Transform(target)
}

transform.prototype = Transform.prototype

export default transform;
