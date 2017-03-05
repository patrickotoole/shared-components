function d3_wrapper_with_title(target,title,cls,data) {
  var w = d3_updateable(target,"." + cls,"div",data)
    .classed(cls,true)

  w.exit().remove()

  d3_updateable(w,"h4","h4").text(title)

  return d3_updateable(w,".row").classed("row",true)

}

export default d3_wrapper_with_title;
