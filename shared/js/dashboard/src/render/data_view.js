import * as transform from '../data_helpers'
import table from 'table'
import time_series from '../timeseries'
import * as timeseries from '../timeseries'
import header from '../header'
import button_radio from './button_radio'
import conditional_show from './conditional_show'
import domain_view from './views/domain_view'





export default function render_data_view(_lower,data) {

      // ----- BEGIN STATE STUFF ----- //

      var SELECTION_STATES = [
            {"key":"Explore data","value":"data-view"}
          , {"key":"Create Media Plan", "value":"media-view"}
          , {"key":"Build Content Brief", "value":"content-view"}
        ]

      var view = this._state.get("view",false)

      var set_state = function(x) { 
        this._state.set("view",x) 
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
          self._state.get("tabs",[]).map(function(x,i) { tabs[i].selected = x })

          if ((tabs[0].selected == undefined) && (!self._state.get("tabs")))  self._state.set("tabs",[1,0]) 
        }

        if (x.value == "media-view") {
          x.data = data
        }

      })

      // ----- END STATE STUFF ----- //

      button_radio(_lower)
        .on("click", function(x) {
          set_state(x.value)
          
          show()
        })
        .data(SELECTION_STATES)
        .draw()



      var show = function() {

        return conditional_show(_lower)
          .data(SELECTION_STATES)
          .classed("view-option",true)
          .draw()
      }

      var conditional = show()

      var _explore;
      conditional.each(function(x) {
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
      
    }
