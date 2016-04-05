var RB = RB || {};
RB.menu = RB.menu || {};

RB.menu.action = RB.menu.action || {};
RB.menu.action = {
  "topbar": function(target,data,items) {

    var topbar = d3_updateable(target,".topbar","div")
      .classed("topbar",true)

    if (data.values[0] && data.values[0].key) {
      topbar.text("")
      var dt = data.values.filter(function(x){return x.key != "Other"})
      var total = d3.sum(data.values,function(z){z.count = z.values.length; return z.count })

      dt.unshift({"key":"All Segments","count":total})

      topbar.datum(dt)

      var data = data
      var menu = this

      var items = d3_splat(topbar,".item","a",false,function(x){return x.key})
        .classed("item",true)
        .html(function(x){return x.key + " <span style='color:#ddd'>("+ x.count + ")</span>"})
        .attr("style",function(x,i){ return (x.key == data.selection) ? undefined : "background:none" })
        .on("click",function(x){
          d3.selectAll('.funnels').remove();
          var self = this;
          items.style("background","none")
          items.filter(function(){ return this == self}).style("background",undefined)

          data.selection = x.key

          var obj = {
            "name":"Segments",
            "push_state": "/crusher/action/existing",
            "class": "glyphicon glyphicon-th-large",
            "values_key": "action_name",
            "selection": data.selection,
            "filter": function(y){
              if (x.key == "All Segments") return true
              if (x.key == y.action_classification) return true
              return false
            }
          }

          menu.navigation.forward.bind(this)(obj,false)

        })
    }
  },
  "heading": function(target,data,has_back,self,items){

    target.style("text-align","left")

    var wrapper = d3_updateable(target,".heading","h5")
      .classed("heading",true)
      .style("overflow","visible")
      .style("z-index","1")
      .style("text-align","left")
      .style("padding-left","10px")
      .text("")

    var filter_wrapper = d3_updateable(wrapper,".btn-group","div")
      .classed("btn-group btn-small dropdown",true)

    var btn = d3_updateable(filter_wrapper,"button","button")
      .classed("btn btn-default dropdown-toggle btn-sm",true)
      .attr("data-toggle","dropdown")
      .attr("aria-haspopup", "true")
      .attr("aria-expanded", "false")
      .style("width","140px")
      .style("border","0px")


    var setText = function(text) {
      var wrap = d3_updateable(btn,".caret-wrap","span")
        .classed("caret-wrap",true)
        .style("margin-left","5px")
        .style("float","right")
        .style("line-height","18px")
        .style("width","15px")

      d3_updateable(wrap,".caret","span")
        .classed("caret",true)

      d3_updateable(btn,".text","span")
        .classed("text",true)
        .style("width","100px")
        .style("margin-bottom","-4px")
        .style("overflow","hidden")
        .style("display","inline-block")
        .style("height","15px")
        .text(text)

    }


    var data = data

    if (data) setText(data.selection)

    var dropdown = d3_updateable(filter_wrapper,"ul","ul")
      .classed("dropdown-menu",true)

    var all_filter = d3_updateable(dropdown,"li","li",{"key": this.state.action}, function(x){ return 1})

    d3_updateable(all_filter,"a","a")
      .text(function(x) { return x.key })
      .on("click",function(x){

        data.selection = x.key

        var i = items.wrapper.datum(function(l){
          var parentData = d3.select(this.parentNode).datum().values
          return {"values":parentData}
        })

        items.render(i,data,items.transform)
        setText(x.key)


      })

    var menu = this;

    var dropdown_items = d3_splat(dropdown,"li","li",function(x){return x.values},function(x){return x.key})
    var dropdown_links = d3_updateable(dropdown_items,"a","a")
      .text(function(x){ return x.key })
      .on("click",function(x){

        data.selection = x.key

        var i = items.wrapper.datum(function(l){
          var parentData = d3.select(this.parentNode).datum().values
          var filtered = parentData.filter(function(z){return x.key == z.key})
          return {"values":filtered}
        })

        items.render(i,data,items.transform)
        setText(x.key)

      })

    dropdown_items.filter(function(x){  return !x.key })
      .text("")
      .classed("divider",true)




    return filter_wrapper
  },
  "items": function(target,data,has_back){

    var menu = this
    var classname = (target.datum().values_key),
      should_show = (!!target.datum().values_key && !target.datum().hide_href )

    target.datum(function(d) {
      if (d.values[0].key) return d.values
      return []
    })

    var data = data

    var section = d3_splat(target,".menu-section","section",function(x) {
        if (data.selection == "All Segments") return x
        return x.filter(function(y) {return y.key == data.selection})
      },function(x){return x.key})
      .classed("menu-section",true)

    section.exit().remove()

    d3_updateable(section,".heading","div")
      .classed("heading",true)
      .text(function(x){ return x.key })


    var dfn = function(x) { return x ? x.values : [] }
    var kfn = function(x) { return x.action_name + x.push_state }

    var menu = this;

    var items = d3_splat(section, "a.item","a",dfn,kfn)
      .classed("item item-" + classname,true)
      .attr("href",function(x){
        return should_show ?
          window.location.pathname + "?id=" + x[classname] :
          undefined
      })
      .text(function(x){
        return x.action_name
      })
      .on("click", function(x){

        d3.event.preventDefault()
        d3.select(this.parentNode).selectAll(".item").classed("active",false)
        d3.select(this).classed("active",true)
        menu.navigation.forward.bind(this)(x)
      })

    items.exit().remove()

  }
}
