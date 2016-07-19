import accessor from './helpers'
import {topSection as topSection} from './helpers'
import {remainingSection as remainingSection} from './helpers'
import summary_box from './summary_box'
import * as transform from './data_helpers'

import bar_selector from './bar_selector'
import time_selector from './time_selector'
import table from './table'




export function Dashboard(target) {
  this._target = target
    .append("ul")
    .classed("vendors-list",true)
      .append("li")
      .classed("vendors-list-item",true);
}

export default function dashboard(target) {
  return new Dashboard(target)
}

Dashboard.prototype = {
    data: function(val) { return accessor.bind(this)("data",val) }
  , draw: function() {
      this._target
      this._categories = {}
      this.render_lhs()
      this.render_center()
      this.render_right()

    }
  , render_lhs: function() {
      this._lhs = d3_updateable(this._target,".lhs","div")
        .classed("lhs col-md-3",true)

      var current = this._lhs

      var _top = topSection(current)

      summary_box(_top)
        .data({
             "key":""
           , "values": [
/*
                {  
                    "key":"Off-site Views"
                  , "value": 12344
                }
              , {
                    "key":"Off-site Uniques"
                  , "value": 12344
                }
*/
              ]
         })
        .draw()

      var _lower = remainingSection(current)
      var self = this

      this._data.display_categories = this._data.display_categories || transform.buildCategories(this._data)

      bar_selector(_lower)
        .data(this._data.display_categories)
        .on("click",function(x) {
          console.log(x)
          x.selected = !x.selected
          console.log(x)
          self.draw() 
        })
        .draw()

    }
  , render_center: function() {
      this._center = d3_updateable(this._target,".center","div")
        .classed("center col-md-6",true)

      var current =  this._center

      var _top = topSection(current)

      time_selector(_top)
        .data(transform.buildTimes(this._data))
        .draw()

      var _lower = remainingSection(current)

      table(_lower)
        .data(transform.buildUrls(this._data))
        .draw()

    }
  , render_right: function() {
      this._right = d3_updateable(this._target,".right","div")
        .classed("right col-md-3",true)

      var current = this._right

      var _top = topSection(current)

      summary_box(_top)
        .data({"key":"","values":[]})//{"key":"On-Site Visits","values":[]})
        .draw()

      var _lower = remainingSection(current)

      bar_selector(_lower)
        .data({"key":"Segments","values":[]})
        .draw()

    }

}
