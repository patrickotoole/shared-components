import render_wrapper from './stage/render_wrapper'
import render_header from './stage/render_header'
import render_main from './stage/render_main'



function accessor(attr, val) {
  if (val === undefined) return this["_" + attr]
  this["_" + attr] = val
  return this
}

export function Stage(target) {
  this._target = target;
  this._wrapper = this._target;
  this._title = "Welcome to Rockerbox"
  this._subtitle = "Getting started is easy. Copy and paste the pixel below to the <head> section of your website."
  this._left = "<div class='codepeek_text'>" + 
      "Implementing Rockerbox is simple.<br><br>" + 
      "<b>First,</b> place the pixel on all pages of your website.<br><br>" + 
      "<b>Then,</b> click validate to ensure its collecting information from your site." + 
    "</div>"
  this._right = "<div class='codepeek_text'>" + 
      "Create your first segment by following our <a >Quickstart Guide</a><br><br>" +
      "Take a tour of our <a>Insights Modules</a> and start crafting content.<br/><br/>" + 
      "Read through our <a>Implementation Guide</a> to track custom events and insights" + 
    "</div>"

  return 1
}

export default function stage(target) {
  return new Stage(target)
}

Stage.prototype = {
    draw: function() {
      this._target

      this.render_wrapper()
      this.render_header()
      this.render_main()


      return this
    }
  , render_wrapper: render_wrapper
  , render_header: render_header

  , render_main: render_main

  , data: function(val) { return accessor.bind(this)("data",val) }
  , title: function(val) { return accessor.bind(this)("title",val) }
  , subtitle: function(val) { return accessor.bind(this)("subtitle",val) }
  , left: function(val) { return accessor.bind(this)("left",val) }
  , right: function(val) { return accessor.bind(this)("right",val) }


}
