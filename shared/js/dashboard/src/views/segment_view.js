import accessor from '../helpers'
import header from '../generic/header'
import button_radio from '../generic/button_radio'
import select from '../generic/select'

import table from 'table'

function noop() {}
function identity(x) { return x }
function key(x) { return x.key }

function simpleBar(wrap,value,scale,color) {

  var height = 20
    , width = wrap.style("width").replace("px","")

  var canvas = d3_updateable(wrap,"svg","svg",[value],function() { return 1})
    .style("width",width+"px")
    .style("height",height+"px")


  var chart = d3_updateable(canvas,'g.chart','g',false,function() { return 1 })
    .attr("class","chart")
  
  var bars = d3_splat(chart,".pop-bar","rect",function(x) { return x}, function(x,i) { return i })
    .attr("class","pop-bar")
    .attr('height',height-4)
    .attr({'x':0,'y':0})
    .style('fill',color)
    .attr("width",function(x) { return scale(x) })


}


export function SegmentView(target) {
  this._on = {
    select: noop
  }
  this.target = target
}



export default function segment_view(target) {
  return new SegmentView(target)
}

SegmentView.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , segments: function(val) {
      return accessor.bind(this)("segments",val) 
    }
  , draw: function() {

      var wrap = d3_updateable(this.target,".segment-wrap","div")
        .classed("segment-wrap",true)
        .style("height","140px")
        .style("width",this.target.style("width"))
        .style("position","fixed")
        .style("z-index","300")
        .style("background","#f0f4f7")


      d3_updateable(this.target,".segment-wrap-spacer","div")
        .classed("segment-wrap-spacer",true)
        .style("height",wrap.style("height"))


      header(wrap)
        .buttons([
            {class: "saved-search", icon: "fa-folder-open-o fa", text: "Open Saved"}
          , {class: "new-saved-search", icon: "fa-bookmark fa", text: "Save"}
        ])
        .on("saved-search.click", this.on("saved-search.click"))
        .on("new-saved-search.click", this.on("new-saved-search.click"))
        .text("Segment").draw()      


      var body = d3_updateable(wrap,".body","div")
        .classed("body",true)
        .style("display","flex")
        .style("flex-direction","column")
        .style("margin-top","-15px")
        .style("margin-bottom","30px")
        

      var row1 = d3_updateable(body,".row-1","div")
        .classed("row-1",true)
        .style("flex",1)
        .style("display","flex")
        .style("flex-direction","row")

      var row2 = d3_updateable(body,".row-2","div")
        .classed("row-2",true)
        .style("flex",1)
        .style("display","flex")
        .style("flex-direction","row")


      var inner = d3_updateable(row1,".action.inner","div")
        .classed("inner action",true)
        .style("flex","1")
        .style("display","flex")
        .style("padding","10px")
        .style("padding-bottom","0px")

        .style("margin-bottom","0px")

      var inner_desc = d3_updateable(row1,".action.inner-desc","div")
        .classed("inner-desc action",true)
        .style("flex","1")
        .style("padding","10px")
        .style("padding-bottom","0px")

        .style("display","flex")
        .style("margin-bottom","0px")


      d3_updateable(inner,"h3","h3")
        .text("Choose Segment")
        .style("margin","0px")
        .style("line-height","32px")
        .style("color","inherit")
        .style("font-size","inherit")
        .style("font-weight","bold")
        .style("text-transform","uppercase")
        .style("flex","1")
        .style("background","#e3ebf0")
        .style("padding-left","10px")
        .style("margin-right","10px")
        .style("margin-top","2px")
        .style("margin-bottom","2px")
        .style("height","100%")



        d3_updateable(inner,"div.color","div")
          .classed("color",true)
          .style("background-color","#081d58")
          .style("width","10px")
          .style("height","32px")
          .style("margin-top","2px")
          .style("margin-right","10px")
          .style("margin-left","-10px")


      wrap.selectAll(".header-body")
        .classed("hidden",!this._is_loading)
        .style("text-align","center")
        .style("margin-bottom","-40px")
        .style("padding-top","10px")
        .style("height","0px")
        .style("background","none")
        .html("<img src='/static/img/general/logo-small.gif' style='height:15px'/> loading...")


      var self = this

      select(inner)
        .options(this._segments)
        .on("select", function(x){
          

          self.on("change").bind(this)(x)
        })
        .selected(this._action.value || 0)
        .draw()


      var inner2 = d3_updateable(row2,".comparison.inner","div")
        .classed("inner comparison",true)
        .style("flex","1")
        .style("padding","10px")
        .style("padding-bottom","0px")

        .style("display","flex")

      var inner_desc2 = d3_updateable(row2,".comparison-desc.inner","div")
        .classed("inner comparison-desc",true)
        .style("flex","1")
        .style("padding","10px")
        .style("padding-bottom","0px")

        .style("display","flex")

      //d3_updateable(inner_desc,"h3","h3")
      //  .text("(Filters applied to this segment)")
      //  .style("margin","10px")
      //  .style("color","inherit")
      //  .style("font-size","inherit")
      //  .style("font-weight","bold")
      //  .style("text-transform","uppercase")
      //  .style("flex","1")

      d3_updateable(inner_desc,".bar-wrap-title","h3").classed("bar-wrap-title",true)
        .style("flex","1 1 0%")
        .style("margin","0px")
        .style("line-height","32px")
        .style("color","inherit")
        .style("font-size","inherit")
        .style("font-weight","bold")
        .style("text-transform","uppercase")
        .style("padding-left","10px")
        .style("margin-right","10px")
        .style("margin-top","2px")
        .style("margin-bottom","2px")
        .style("height","100%")
        .style("text-align","right")


        .text("views")

      d3_updateable(inner_desc2,".bar-wrap-title","h3").classed("bar-wrap-title",true)
        .style("flex","1 1 0%")
        .style("margin","0px")
        .style("line-height","32px")
        .style("color","inherit")
        .style("font-size","inherit")
        .style("font-weight","bold")
        .style("text-transform","uppercase")
        .style("padding-left","10px")
        .style("margin-right","10px")
        .style("margin-top","2px")
        .style("margin-bottom","2px")
        .style("height","100%")
        .style("text-align","right")



        .text("views")






      var bar_samp = d3_updateable(inner_desc,"div.bar-wrap","div")
        .classed("bar-wrap",true)
        .style("flex","3 1 0%")
        .style("margin-top","8px")

      d3_updateable(inner_desc,".bar-wrap-space","div").classed("bar-wrap-space",true)
        .style("flex","2 1 0%")
        .style("line-height","36px")
        .style("padding-left","10px")
        .text(d3.format(",")(this._data.views.sample))


      d3_updateable(inner_desc,".bar-wrap-opt","div").classed("bar-wrap-opt",true)
        .style("flex","4 1 0%")
        .style("line-height","36px")
        //.text("apply filters?")



      var xscale = d3.scale.linear()
        .domain([0,Math.max(this._data.views.sample, this._data.views.population)])
        .range([0,bar_samp.style("width")])


      var bar_pop = d3_updateable(inner_desc2,"div.bar-wrap","div")
        .classed("bar-wrap",true)
        .style("flex","3 1 0%")
        .style("margin-top","8px")


      d3_updateable(inner_desc2,".bar-wrap-space","div").classed("bar-wrap-space",true)
        .style("flex","2 1 0%")
        .style("line-height","36px")
        .style("padding-left","10px")
        .text(d3.format(",")(this._data.views.population))


      d3_updateable(inner_desc2,".bar-wrap-opt","div").classed("bar-wrap-opt",true)
        .style("flex","4 1 0%")
        .style("margin","0px")
        .style("line-height","32px")
        .style("color","inherit")
        .style("font-size","inherit")
        .style("font-weight","bold")
        .style("text-transform","uppercase")
        .style("height","100%")
        .style("text-align","right")
        .html("apply filters? <input type='checkbox'></input>")



      simpleBar(bar_samp,this._data.views.sample,xscale,"#081d58")
      simpleBar(bar_pop,this._data.views.population,xscale,"grey")











      d3_updateable(inner2,"h3","h3")
        .text("Compare Against")
        .style("line-height","32px")
        .style("margin","0px")
        .style("color","inherit")
        .style("font-size","inherit")
        .style("font-weight","bold")
        .style("flex","1")
        .style("text-transform","uppercase")
        .style("background","#e3ebf0")
        .style("padding-left","10px")
        .style("margin-right","10px")
        .style("margin-top","2px")
        .style("margin-bottom","2px")
        .style("height","100%")



      d3_updateable(inner2,"div.color","div")
        .classed("color",true)
        .style("background-color","grey")
        .style("width","10px")
        .style("height","32px")
        .style("margin-top","2px")
        .style("margin-right","10px")
        .style("margin-left","-10px")








      select(inner2)
        .options([{"key":"Current Segment (without filters)","value":false}].concat(this._segments) )
        .on("select", function(x){

          self.on("comparison.change").bind(this)(x)
        })
        .selected(this._comparison.value || 0)
        .draw()


      return this
    }
  , action: function(val) {
      return accessor.bind(this)("action",val)
    }
  , comparison: function(val) {
      return accessor.bind(this)("comparison",val)
    }
  , is_loading: function(val) {
      return accessor.bind(this)("is_loading",val)
    }

  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }
}

