import d3 from 'd3'
import {d3_updateable, d3_splat} from '@rockerbox/helpers'
import './view.css'
import * as state from '@rockerbox/state'
//import {media_plan} from 'media_plan'
import filter_view from './views/filter_view'
import option_view from './views/option_view'
import domain_view from './views/domain_view'
import window_view from './views/window_view'

import segment_view from './views/segment_view'
import summary_view from './views/summary/view'
import relative_view from './views/relative_timing/view'
import timing_view from './views/timing/view'
import staged_filter_view from './views/staged_filter_view'





import conditional_show from './generic/conditional_show'

import share from './generic/share'
import select from './generic/select'

import accessor from './helpers'
import * as transform from './helpers'

function noop() {}

export function NewDashboard(target) {
  this.target = target
  this._on = {}
}

export default function new_dashboard(target) {
  return new NewDashboard(target)
}

NewDashboard.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , transform: function(val) {
      return accessor.bind(this)("transform",val) || ""
    }
  , staged_filters: function(val) {
      return accessor.bind(this)("staged_filters",val) || ""
    }
  , media: function(val) {
      return accessor.bind(this)("media",val) 
    }
  , saved: function(val) {
      return accessor.bind(this)("saved",val) 
    }
  , line_items: function(val) {
      return accessor.bind(this)("line_items",val) || []
    }
  , selected_action: function(val) {
      return accessor.bind(this)("selected_action",val) 
    }
  , selected_comparison: function(val) {
      return accessor.bind(this)("selected_comparison",val) 
    }
  , action_date: function(val) {
      return accessor.bind(this)("action_date",val) 
    }
  , comparison_date: function(val) {
      return accessor.bind(this)("comparison_date",val) 
    }

  , view_options: function(val) {
      return accessor.bind(this)("view_options",val) || []
    }
  , logic_options: function(val) {
      return accessor.bind(this)("logic_options",val) || []
    }
  , explore_tabs: function(val) {
      return accessor.bind(this)("explore_tabs",val) || []
    }
  , logic_categories: function(val) {
      return accessor.bind(this)("logic_categories",val) || []
    }
  , actions: function(val) {
      return accessor.bind(this)("actions",val) || []
    }
  , summary: function(val) {
      return accessor.bind(this)("summary",val) || []
    }
  , time_summary: function(val) {
      return accessor.bind(this)("time_summary",val) || []
    }
  , time_tabs: function(val) {
      return accessor.bind(this)("time_tabs",val) || []
    }
  , category_summary: function(val) {
      return accessor.bind(this)("category_summary",val) || []
    }
  , keyword_summary: function(val) {
      return accessor.bind(this)("keyword_summary",val) || []
    }
  , before: function(val) {
      return accessor.bind(this)("before",val) || []
    }
  , before_tabs: function(val) {
      return accessor.bind(this)("before_tabs",val) || []
    }
  , after: function(val) {
      return accessor.bind(this)("after",val) || []
    }
  , filters: function(val) {
      return accessor.bind(this)("filters",val) || []
    }
  , loading: function(val) {
      if (val !== undefined) this._segment_view && this._segment_view.is_loading(val).draw()
      return accessor.bind(this)("loading",val)
    }
  , sort: function(val) {
      return accessor.bind(this)("sort",val)
    }
  , ascending: function(val) {
      return accessor.bind(this)("ascending",val)
    }
  , is_comparison: function(val) {
      return accessor.bind(this)("is_comparison",val) || false
    }

  , draw: function() {

      var data = this.data()
      var media = this.media()

      var options = JSON.parse(JSON.stringify(this.view_options()))
      var tabs = JSON.parse(JSON.stringify(this.explore_tabs()))


      var logic = JSON.parse(JSON.stringify(this.logic_options()))
        , categories = this.logic_categories()
        , filters = JSON.parse(JSON.stringify(this.filters()))
        , actions = JSON.parse(JSON.stringify(this.actions()))
        , staged_filters = JSON.parse(JSON.stringify(this.staged_filters()))

      var segmentViewHeight = this.is_comparison() ? 170 : 120



      var target = this.target
      var self = this

      this._segment_view = segment_view(target)
        .is_comparison(self.is_comparison())
        .is_loading(self.loading() || false)
        .segments(actions)
        .data(self.summary())
        .action(self.selected_action() || {})
        .action_date(self.action_date() || "")
        .comparison_date(self.comparison_date() || "")

        .comparison(self.selected_comparison() || {})
        .on("change", this.on("action.change"))
        .on("action_date.change", this.on("action_date.change"))
        .on("comparison.change", this.on("comparison.change"))
        .on("comparison_date.change", this.on("comparison_date.change"))
        .on("download.click", function() {  
          var ss = share(d3.select("body")).draw()
          ss.inner(function(target) {

            var header = d3_updateable(target,".header","h4")
              .classed("header",true)
              .style("text-align","center")
              .style("text-transform","uppercase")
              .style("font-family","ProximaNova, sans-serif")
              .style("font-size","12px")
              .style("font-weight","bold")
              .style("padding-top","30px")
              .style("padding-bottom","30px")
              .text("Download a saved media plan")

            var form = d3_updateable(target,"div","div",self.saved())
              .style("text-align","left")
              .style("padding-left","25%")

            if (!self.saved() || self.saved().length == 0) {
              d3_updateable(form,"span","span")
                .text("You currently have no saved mediaplans")
            } else {
              d3_splat(form,".row","a",function(x) { return x },function(x) { return x.name })
                .classed("row",true)
                .attr("href", x => {

                  var filter_id = x.endpoint.split("selected_action=")[1].split("&")[0]
                  return "/mediaplan/cache?format=csv&filter_id=" + filter_id + "&name=" + x.name
                })
                .attr("download",x => x.name + "-export.csv")
                .text(x => x.name)

            }

          })

        })
        .on("saved-search.click", function() {  
          var ss = share(d3.select("body")).draw()
          ss.inner(function(target) {

            var header = d3_updateable(target,".header","h4")
              .classed("header",true)
              .style("text-align","center")
              .style("text-transform","uppercase")
              .style("font-family","ProximaNova, sans-serif")
              .style("font-size","12px")
              .style("font-weight","bold")
              .style("padding-top","30px")
              .style("padding-bottom","30px")
              .text("Open a saved dashboard")

            var form = d3_updateable(target,"div","div",self.saved())
              .style("text-align","left")
              .style("padding-left","25%")

            if (!self.saved() || self.saved().length == 0) {
              d3_updateable(form,"span","span")
                .text("You currently have no saved dashboards")
            } else {
              d3_splat(form,".row","a",function(x) { return x },function(x) { return x.name })
                .classed("row",true)
                //.attr("href", x => x.endpoint)
                .text(x => x.name)
                .on("click", function(x) {
                  // HACK: THIS is hacky...
                  var _state = state.qs({}).from("?" + x.endpoint.split("?")[1])

                  ss.hide()
                  window.onpopstate({state: _state})
                  d3.event.preventDefault()
                  return false
                })

            }

          })

        })
        .on("new-saved-search.click", function() { 
          var ss = share(d3.select("body")).draw()
          ss.inner(function(target) {

            var header = d3_updateable(target,".header","h4")
              .classed("header",true)
              .style("text-align","center")
              .style("text-transform","uppercase")
              .style("font-family","ProximaNova, sans-serif")
              .style("font-size","12px")
              .style("font-weight","bold")
              .style("padding-top","30px")
              .style("padding-bottom","30px")
              .text("Save this dashboard:")

            var form = d3_updateable(target,"div","div")
              .style("text-align","center")

            var name = d3_updateable(form, ".name", "div")
              .classed("name",true)
            
            d3_updateable(name,".label","div")
              .style("width","130px")
              .style("display","inline-block")
              .style("text-transform","uppercase")
              .style("font-family","ProximaNova, sans-serif")
              .style("font-size","12px")
              .style("font-weight","bold")
              .style("text-align","left")
              .text("Dashboard Name:")

            var name_input = d3_updateable(name,"input","input")
              .style("width","270px")
              .attr("placeholder","My awesome search")

            var advanced = d3_updateable(form, ".advanced", "details")
              .classed("advanced",true)
              .style("width","400px")
              .style("text-align","left")
              .style("margin","auto")


            
            d3_updateable(advanced,".label","div")
              .style("width","130px")
              .style("display","inline-block")
              .style("text-transform","uppercase")
              .style("font-family","ProximaNova, sans-serif")
              .style("font-size","12px")
              .style("font-weight","bold")
              .style("text-align","left")
              .text("Line Item:")

            var select_box = select(advanced)
              .options(self.line_items().map(x => { return {key:x.line_item_name, value: x.line_item_id} }) )
              .draw()
              ._select
              .style("width","270px")




            var send = d3_updateable(form, ".send", "div")
              .classed("send",true)
              .style("text-align","center")


            d3_updateable(send,"button","button")
              .style("line-height","16px")
              .style("margin-top","10px")
              .text("Send")
              .on("click",function(x) {
                var name = name_input.property("value") 
                var line_item = select_box.node().selectedOptions.length ? select_box.node().selectedOptions[0].__data__.key : false

                d3.xhr("/crusher/saved_dashboard")
                  .post(JSON.stringify({
                        "name": name
                      , "endpoint": window.location.pathname + window.location.search
                      , "line_item": line_item
                    })
                  )

                ss.hide()

              })
              .text("Save")



          })


        })
        .draw()

      if (this.summary() == false) return false

      filter_view(target)
        .logic(logic)
        .categories(categories)
        .filters(filters)
        .data(data)
        .on("logic.change", this.on("logic.change"))
        .on("filter.change", this.on("filter.change"))
        .draw()

      options = this.is_comparison() ? 
        options.filter((x) => x.key === "Comparison") : 
        options.filter((x) => x.key !== "Comparison")


      if (!this.is_comparison()) {
        option_view(target)
          .data(options)
          .on("select", this.on("view.change") )
          .draw()
      }

      conditional_show(target)
        .data(options)
        .classed("view-option",true)
        .draw()
        .each(function(x) {

          if (!x.selected) return

          var dthis = d3.select(this)

          if (x.value == "data-view") {
            var dv = domain_view(dthis)
              .options(tabs)
              .top(segmentViewHeight)
              .data(data)
              .sort(self.sort())
              .ascending(self.ascending())
              .on("select", self.on("tab.change") )
              .on("sort", self.on("sort.change") )

              .on("stage-filter",function(x) {

               staged_filters = staged_filters.split(",").concat(x.key || x.url).filter(x => x.length).join(",")
               self.on("staged-filter.change")(staged_filters)
               HACKbuildStagedFilter(staged_filters)
    
             })
             .draw()
          }

          


          //if (x.value == "media-view") {
          //  media_plan(dthis.style("margin-left","-15px").style("margin-right","-15px"))
          //   .data(data)
          //   .draw()
          //}

          if (x.value == "ba-view") {
            relative_view(dthis)
             .top(segmentViewHeight)
             .transform(self.transform())
             .data(self.before_tabs())
             .sort(self.sort())
             .ascending(self.ascending())
             .on("transform.change", self.on("transform.change") )
             .on("select", self.on("tab.change") )
             .on("sort", self.on("sort.change") )
             .on("stage-filter",function(x) {

               staged_filters = staged_filters.split(",").concat(x.key || x.url).filter(x => x.length).join(",")
               self.on("staged-filter.change")(staged_filters)
               HACKbuildStagedFilter(staged_filters)

    
             })
             .draw()
          }


          if (x.value == "stage-view") {
            var dv = window_view(dthis)
              .options(tabs)
              .top(segmentViewHeight)
              .data(self.before_tabs())
              .sort(self.sort())
              .ascending(self.ascending())
              .on("select", self.on("tab.change") )
              .on("sort", self.on("sort.change") )
              .on("stage-filter",function(x) {

               staged_filters = staged_filters.split(",").concat(x.key || x.url).filter(x => x.length).join(",")
               self.on("staged-filter.change")(staged_filters)
               HACKbuildStagedFilter(staged_filters)
    
             })
             .draw()
          }

          if (x.value == "summary-view") {
            summary_view(dthis)
             .data(self.summary())
             .timing(self.time_summary())
             .category(self.category_summary())
             .before(self.before())
             //.after(self.after())
             .keywords(self.keyword_summary())
             .on("ba.sort",self.on("ba.sort"))
             .draw()
          }

          if (x.value == "timing-view") {
            timing_view(dthis)
             .top(segmentViewHeight)
             .data(self.time_tabs())
             .transform(self.transform())
             .sort(self.sort())
             .ascending(self.ascending())
             .on("transform.change", self.on("transform.change") )
             .on("select", self.on("tab.change") )
             .on("sort", self.on("sort.change") )

             .on("stage-filter",function(x) {

               staged_filters = staged_filters.split(",").concat(x.key || x.url).filter(x => x.length).join(",")
               self.on("staged-filter.change")(staged_filters)
               HACKbuildStagedFilter(staged_filters)

    
             })
             .draw()
          }

        })

      function HACKbuildStagedFilter(staged) {

        staged_filter_view(target)
          .data(staged)
          .on("update",function(x) {
            self.on("staged-filter.change")(x)
          })
          .on("modify",function(x) {
            self.on("staged-filter.change")("")
            self.on("modify-filter")(x)
          })

          .on("add",function(x) {
            self.on("staged-filter.change")("")
            self.on("add-filter")(x)
          })
          .draw()
      }
      HACKbuildStagedFilter(staged_filters)

      return this

    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }

}
