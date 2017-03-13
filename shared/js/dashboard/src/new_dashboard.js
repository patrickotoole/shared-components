import filter_view from './views/filter_view'
import option_view from './views/option_view'
import domain_view from './views/domain_view'
import segment_view from './views/segment_view'
import summary_view from './views/summary_view'



import conditional_show from './generic/conditional_show'


import accessor from './helpers'
import * as transform from './data_helpers'

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
  , view_options: function(val) {
      return accessor.bind(this)("view_options",val) 
    }
  , logic_options: function(val) {
      return accessor.bind(this)("logic_options",val) 
    }
  , explore_tabs: function(val) {
      return accessor.bind(this)("explore_tabs",val) 
    }
  , logic_categories: function(val) {
      return accessor.bind(this)("logic_categories",val) 
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
  , category_summary: function(val) {
      return accessor.bind(this)("category_summary",val) || []
    }
  , keyword_summary: function(val) {
      return accessor.bind(this)("keyword_summary",val) || []
    }
  , before: function(val) {
      return accessor.bind(this)("before",val) || []
    }
  , after: function(val) {
      return accessor.bind(this)("after",val) || []
    }
  , filters: function(val) {
      return accessor.bind(this)("filters",val) 
    }
  , draw: function() {

      var data = this.data()

      var options = JSON.parse(JSON.stringify(this.view_options()))
      var tabs = JSON.parse(JSON.stringify(this.explore_tabs()))


      var logic = JSON.parse(JSON.stringify(this.logic_options()))
        , categories = this.logic_categories()
        , filters = JSON.parse(JSON.stringify(this.filters()))
        , actions = JSON.parse(JSON.stringify(this.actions()))


      var target = this.target
      var self = this

      segment_view(target)
        .segments(actions)
        .data(self.summary())
        .on("change", this.on("action.change"))
        .on("comparison.change", this.on("comparison.change"))
        .draw()

      filter_view(target)
        .logic(logic)
        .categories(categories)
        .filters(filters)
        .data(data)
        .on("logic.change", this.on("logic.change"))
        .on("filter.change", this.on("filter.change"))
        .draw()

      option_view(target)
        .data(options)
        .on("select", this.on("view.change") )
        .draw()

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
              .data(data)
              .on("select", self.on("tab.change") )
              .draw()
          }

          if (x.value == "media-view") {
            media_plan.media_plan(dthis.style("margin-left","-15px").style("margin-right","-15px"))
             .data(data)
             .draw()
          }

          if (x.value == "summary-view") {
            summary_view(dthis)
             .data(self.summary())
             .timing(self.time_summary())
             .category(self.category_summary())
             .before(self.before())
             .after(self.after())
             .keywords(self.keyword_summary())
             .on("ba.sort",self.on("ba.sort"))
             .draw()
          }

        })

      return this

    }
  , on: function(action, fn) {
      if (fn === undefined) return this._on[action] || noop;
      this._on[action] = fn;
      return this
    }

}
