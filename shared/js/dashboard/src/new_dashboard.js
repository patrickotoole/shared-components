import filter_view from './views/filter_view'
import option_view from './views/option_view'
import domain_view from './views/domain_view'

import conditional_show from './generic/conditional_show'


import accessor from './helpers'
import * as transform from './data_helpers'



export function NewDashboard(target) {
  this.target = target
}

export default function new_dashboard(target) {
  return new NewDashboard(target)
}

NewDashboard.prototype = {
    data: function(val) {
      return accessor.bind(this)("data",val) 
    }
  , draw: function() {

      var data = this.data()

        var categories = d3.nest()
          .key(function(x){ return x.parent_category_name})
          .rollup(function(v) {
            return v.reduce(function(p,c) { return p + c.uniques },0)
          })
          .entries(data.full_urls)

        var total = categories.reduce(function(p,c) { return p + c.values },0)

        categories.map(function(x) {
          x.value = x.values
          x.percent = x.value / total
        })

        data["display_categories"] = {
            "key":"Categories"
          , "values": categories.filter(function(x) { return x.key != "NA" })
        }

        var category_hour = d3.nest()
          .key(function(x){ return x.parent_category_name + x.hour + x.minute})
          .rollup(function(v) {
            return {
                "parent_category_name": v[0].parent_category_name
              , "hour": v[0].hour
              , "minute": v[0].minute 
              , "count":v.reduce(function(p,c) { return p + c.count },0)
            }
          })
          .entries(data.full_urls)
          .map(function(x) { return x.values })

        data["category_hour"] = category_hour


      // ----- BEGIN STATE STUFF ----- //

      var SELECTION_STATES = [
            {"key":"Explore data","value":"data-view"}
          , {"key":"Create Media Plan", "value":"media-view"}
          , {"key":"Build Content Brief", "value":"content-view"}
        ]

      var view = "data-view" //this._state.get("view",false)

      var set_state = function(x) { 
        // this._state.set("view",x) 
        SELECTION_STATES.map(function(d) { 
          d.selected = (x == d.value)
        })
      }.bind(this)

      var self = this

      SELECTION_STATES.map(function(x) { 
        x.selected = (x.value == view)

        if (x.value == "data-view") {
          x.data = [
              transform.buildDomains(data)
            , transform.buildUrls(data)
            , transform.buildTopics(data)
          ]

          var tabs = x.data
          //self._state.get("tabs",[]).map(function(x,i) { tabs[i].selected = x })

          //if ((tabs[0].selected == undefined) && (!self._state.get("tabs")))  self._state.set("tabs",[1,0]) 
        }

        if (x.value == "media-view") {
          x.data = data
        }

      })

      var selectViewOption = function(x) {
          set_state(x.value)
        }

      // ----- END STATE STUFF ----- //

      var target = this.target

      filter_view(target)
        .draw()

      option_view(target)
        .data(SELECTION_STATES)
        .on("select", selectViewOption)
        .draw()

      conditional_show(target)
        .data(SELECTION_STATES)
        .classed("view-option",true)
        .draw()
        .each(function(x) {
          if (x.value == "data-view") {

            var dv = domain_view(d3.select(this))
              .options(x.data)
              .data(data)
              .on("select", function(d) {

                x.data.map(function(q) { 
                  if (q.key == d.key) return q.selected = 1
                  q.selected = 0 
                })

                dv.draw()
              })
              .draw()
           
          }

          if (x.value == "media-view") {
            media_plan.media_plan(d3.select(this))
             .data(data)
             .draw()
          }
        })

      return this

    }
}
