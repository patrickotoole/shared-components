import accessor from './helpers'
import {topSection as topSection} from './helpers'
import {remainingSection as remainingSection} from './helpers'
import summary_box from './summary_box'

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
        .draw()

      remainingSection(current)
        .text("Yo")

    }
  , render_center: function() {
       this._center = d3_updateable(this._target,".center","div")
         .classed("center col-md-6",true)

       var current =  this._center

       topSection(current)
        .text("Yo")

      remainingSection(current)
        .text("Yo")

    }
  , render_right: function() {
      this._right = d3_updateable(this._target,".right","div")
        .classed("right col-md-3",true)

      var current = this._right

      topSection(current)
        .text("Yo")

      remainingSection(current)
        .text("Yo")

    }

}
