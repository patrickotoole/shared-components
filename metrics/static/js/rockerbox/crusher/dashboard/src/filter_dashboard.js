import accessor from './helpers'
import summary_box from './summary_box'

import * as transform from './data_helpers'
import * as ui_helper from './helpers'

import bar_selector from './bar_selector'
import time_selector from './time_selector'
//import table from './table'
import table from 'table'


import render_filter from './render/filter'
import render_rhs from './render/rhs'
import render_lhs from './render/lhs'
import render_summary from './render/summary'
import render_data_view from './render/data_view'
import * as overlay from './render/overlay'


import state from './state'
import share from './share'
import time_series from './timeseries'





export function FilterDashboard(target) {
  this._on = {}
  this._state = state()

  this._target = target
    .append("ul")
    .classed("vendors-list",true)
      .append("li")
      .classed("vendors-list-item",true);
}

export default function filter_dashboard(target) {
  return new FilterDashboard(target)
}

FilterDashboard.prototype = {
    data: function(val) { return accessor.bind(this)("data",val) }
  , actions: function(val) { return accessor.bind(this)("actions",val) }
  , draw: function() {
      this._target
      this._categories = {}
      this.render_wrappers()
      this._target.selectAll(".loading").remove()
      this.render_lhs()
      this.render_right()

      this.render_center()

    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action];
      this._on[action] = fn;
      return this
    }
  , draw_loading: function() {
      this.render_wrappers()
      this.render_center_loading()
      return this
    }
  , render_wrappers: function() {

      this._lhs = d3_updateable(this._target,".lhs","div")
        .classed("lhs col-md-2",true)
        .style("display","none")

      this._center = d3_updateable(this._target,".center","div")
        .classed("center col-md-9",true)
        .style("float","none")
        .style("margin","auto")



      this._right = d3_updateable(this._target,".right","div")
        .classed("right col-md-3",true)
        .style("display","none")


    }
  , render_center: function() {

      var self = this;

      var CSS_STRING = String(function() {/*
    .header-buttons a span.hover-show { display:none }
    .header-buttons a:hover span.hover-show { display:inline; padding-left:3px }
      */})
    
      d3_updateable(d3.select("head"),"style#header-css","style")
        .attr("id","header-css")
        .text(CSS_STRING.replace("function () {/*","").replace("*/}",""))



      this._center = d3_updateable(this._target,".center","div")
        .classed("center col-md-9",true)

      var current =  this._center
        , _top = ui_helper.topSection(current)
        , _lower = ui_helper.remainingSection(current)

      var head = d3_updateable(_top, "h3","h3")
        .style("margin-bottom","15px")
        .style("margin-top","-5px")
        .text("Filter activity")

      var right_pull = d3_updateable(head,".pull-right","span")
        .classed("pull-right header-buttons", true)
        .style("margin-right","17px")
        .style("line-height","22px")
        .style("text-decoration","none !important")

      d3_updateable(right_pull,".saved-search","a")
        .classed("saved-search",true)
        .style("vertical-align","middle")
        .style("font-size","12px")
        .style("font-weight","bold")
        .style("border-right","1px solid #ccc")
        .style("padding-right","10px")
        .style("display","inline-block")
        .style("line-height","22px")
        .style("text-decoration","none")
        .html("<span class='fa-folder-open-o fa'></span><span style='padding-left:3px'>Open Saved</span>")
        .on("click",function() {
          self.render_saved(_top,_lower)
          var w = _top.selectAll(".filter-wrapper")
          //w.classed("hidden",function(x) { return !w.classed("hidden") })

        })

      d3_updateable(right_pull,".new-saved-search","a")
        .classed("new-saved-search",true)
        .style("font-size","12px")
        .style("font-weight","bold")
        .style("padding-left","10px")
        .style("border-right","1px solid #ccc")
        .style("padding-right","10px")
        .style("display","inline-block")
        .style("line-height","22px")
        .style("text-decoration","none")
        .html("<span class='fa-bookmark fa'></span><span class='hover-show'>Save</span>")

        .on("click",function() {
          //self.render_saved(_top,_lower)
          var w = _top.selectAll(".save-subtitle-filter")
          w.classed("hidden",function(x) { return !w.classed("hidden") })
          
        })

      d3_updateable(right_pull,".share","a")
        .classed("share",true)
        .style("font-size","12px")
        .style("font-weight","bold")
        .style("padding-left","10px")
        .style("border-right","1px solid #ccc")
        .style("padding-right","10px")
        .style("display","inline-block")
        .style("line-height","22px")
        .style("text-decoration","none")
        .html("<span class='fa-paper-plane fa'></span><span class='hover-show'>Share</span>")
        .on("click",overlay.share_search)


      d3_updateable(right_pull,".schedule","a")
        .classed("schedule",true)
        .style("font-size","12px")
        .style("font-weight","bold")
        .style("padding-left","10px")
        .style("border-right","1px solid #ccc")
        .style("padding-right","10px")
        .style("display","inline-block")
        .style("line-height","22px")
        .style("text-decoration","none")
        .html("<span class='fa-calendar fa'></span><span class='hover-show'>Schedule</span>")
        .on("click",overlay.schedule_report)







      this.render_saved(_top,_lower)
      this.render_filter(_top,_lower)

      //this.render_view(_lower,this._data)

    }
  , render_saved: function(_top,_lower) {

      var self = this;

      var saved = d3_updateable(_top,".saved","div")
        .classed("saved",true)
        .classed("hidden",function() { return !d3.select(this).classed("hidden") })
        .style("padding-left","10px")

      var saved_searches = JSON.parse(localStorage.getItem("search.saved")) || []

      var saved_items = d3_splat(saved,".item","a",saved_searches,function(x) { return x.key })
        .style("display","block")
        .style("font-weight","bold")
        .style("margin-left","auto")
        .style("width","240px")
        .classed("item",true)
        .style("line-height","24px")
        .text(function(x) {return x.key})
        .on("click", function(x) {
          self._state.set("filter",x.values)
          self.render_saved(_top,_lower)
          self.render_filter(_top,_lower)
        })

    }
  , render_center_loading: function() {
      this._center = d3_updateable(this._target,".center","div")
        .classed("center col-md-9",true)

      this._center.html("")

      d3_updateable(this._center,"center","center")
        .style("text-align","center")
        .style("display","block")
        .classed("loading",true)
        .text("Loading...")


    }

  , render_lhs: render_lhs
  , render_view: render_data_view
  , render_summary: render_summary
  , render_filter: render_filter
  , render_right: render_rhs
}
