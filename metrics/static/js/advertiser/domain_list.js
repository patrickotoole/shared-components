var buildDomainList = function(obj) {
  var default_panel = obj

  var domain_list_group = default_panel
    .append("div")
    .classed("panel-sub-heading domain-list list-group",true)

  domain_list_group
    .append("div")
    .classed("list-group-item",true)
    .text("Domain List")

  var row = default_panel.append("div")
    .classed("row hidden",true)

  row
    .append("div")
    .classed("col-md-1",true)

  var domain_lists = row
    .append("div")
    .classed("col-md-11",true)
    .append("div")
    .classed("list-group domain-list", true)

  var domain_list = domain_lists
    .selectAll("div")
    .data(function(x){
      return x.domain_lists || []
    })
    .enter()
      .append("div")
      .classed("list-group-item hidden",true)


  var heading = domain_list
    //.classed("list-group-item-heading",true)
    .text(function(x){
      return x.domain_list_name
    })

  domain_lists.append("div")
    .text("loading...")

  domain_list.on("click",function(x){
    x.dont_hide = 1
    d3.select(this.children[1])
      .classed("hidden",function(){
        return !this.classList.contains("hidden")
      })
  })

   

  domain_list_group
    .on("click",function(x){
      console.log("get the rest of the domain list datas")               
      console.log(x.external_advertiser_id)
      var URL = "/admin/advertiser/domain_list?format=json&advertiser_id=" + x.external_advertiser_id
      d3.json(URL,function(d){

        domain_list
          .classed("hidden",false)

        reporting = d3.nest()
          .key(function(x) {return x.log })
          .map(d,d3.map)

        heading
          .append("span")
          .classed("badge",true)
          .text(function(y){
            var z = reporting.get(y.domain_list_name) || []
            return z.length
          })
           
        var table = domain_list
          .append("table")
          .classed("table table-condensed",true)
          .classed("hidden",function(x){
            return !x.dont_hidden
          })

        var head = table.append("thead"),
          h = head.append("tr")

        h.append("th").text("domain")
        h.append("th").text("segment") 


        var body = table.append("tbody")

        var row = body
          .selectAll("tr")
          .data(function(y){
            return reporting.get(y.domain_list_name) || []
          })
          .enter()
            .append("tr")
            .classed("hidden",function(x,i){
              return i > 10
            })

        row.append("td")
          .text(function(x){
            return x.pattern
          })

        row.append("td")
          .text(function(x){
            return x.segment
          }) 
      })
          
    })     

}
 
