var RB = RB || {}
RB.yoshi = RB.yoshi || {}

RB.yoshi.UI = (function(UI){

  UI.campaign = (function(campaign){

    var nestCreatives = function(creatives) {
      var folders = d3.nest()
        .key(function(y){ return y.folder.name }).entries(creatives)
        .filter(function(x){ 
          var v = x.values.reduce(function(p,c){ return p + c.attached },0)
          return v
        })
        .map(function(x){ return x.key }) 
      return folders
    }

    var withProfile = function(x,p){

      x.profile = x.profile || p[0]

      var sizes = (x.profile.size_targets) ?
        x.profile.size_targets
          .map(function(x){ return x.width + "x" + x.height }) : 
        []

      var obj = {
        "profile": x.profile,
        "campaign": x,
        "details": {
          "sizes":sizes,
          "creative_folders":nestCreatives(x.creatives),
          "advertiser":x.advertiser_id
        }
      }

      d3.select(".campaign-verification").classed("hidden",false)

      RB.yoshi.UI.campaign_summary.build(
        d3.select("#campaign-wrapper .panel-default"),
        obj
      )

      d3.select("#validated-campaign-button-div")
        .classed("hidden",true)
      
    };

    campaign.buildCampaignPanel = function(data,wrapper,cr) {

      var creativeMap = d3.nest().key(function(x){return x.id}).rollup(function(x){return x[0]}).map(cr)

      data.map(function(d){
        var crMap = d3.nest().key(function(x){return x.id}).rollup(function(x){return x[0]}).map(d.creatives)
        var copy = JSON.parse(JSON.stringify(cr))
        d.creatives = copy.map(function(c){
          c.attached = !!crMap[c.id]; 
          return c
        })
      })
      
      var wrapper = wrapper || d3.select("#content").selectAll(".wrapper")

      var pixel_group = wrapper.append("div")
        .classed("panel-sub-heading pixel-reporting list-group",true)

      var header = pixel_group.append("div").classed("list-group-item",true)

      header
        .append("h5").classed("list-group-item-heading",true)
        .text("Modify Campaign Settings")

      header.append("div")
        .attr("id","flash")
        .style("float","right")
       

      var body = wrapper.selectAll(".panel-body")
        .data([data])
        .enter()
          .append("div")
          .classed("panel-body",true)
          .style("margin-top","-15px")
          .style("border","1px solid rgb(221, 221, 221)")
          .style("padding","0px")
          .style("padding-top","15px")

      campaign.buildTable(body)
      campaign.startEditable()
    }

    campaign.buildTable = function(body) {
      var table = body.append("table")
        .classed("table",true)

      var thead = table.append("thead").append("tr")

      var headers = ["Name","State","Remove"]
      headers.map(function(x,i){
        thead.append("th").text(x)
          .classed("col-md-10",i==0)
      })


      var tbody = table.append("tbody")
      var tableRow = tbody.selectAll("tr.campaign")
        .data(function(d){return d}); 

      var entered = tableRow.enter()

      var newRow = entered
        .append("tr").classed("campaign",true)
        .style("cursor","pointer")
        .on("click",function(x){

          d3.selectAll("tr.campaign-expansion").remove()

          var i = Array.prototype.indexOf.call(this.parentNode.childNodes, this) + 2;

          var dthis = d3.select(this.parentNode)

          var expansion = dthis
            .insert("tr","tr:nth-child("+i+")").classed("campaign-expansion",true)
            .datum(d3.select(this).datum())
            .append("td")
            .attr("colspan",42)
            .append("div").classed("list-group campaign-expansion",true)
            .style("margin-top","10px") 
            .style("margin-bottom","10px")  

          var creativeGroup = expansion.append("div")
            .classed("edit-group creatives-group",true)

          campaign.buildCreativeGroup(creativeGroup) 

          var locationGroup = expansion.append("div")
            .classed("edit-group location-group hidden",true)

          UI.targeting.location(locationGroup) 
          UI.targeting.frequency(locationGroup)
          UI.targeting.budget(locationGroup) 

          tbody.selectAll("tr")
            .style("background-color","#f0f0f0")
            .style("font-weight",null)

          d3.select(this)
            .style("background-color","white") 
            .style("font-weight","bold");


          (x.profile !== undefined ) ? 
            withProfile(x,x.profile) :
            RB.AJAX.rockerbox.getProfile(x.profile_id,withProfile.bind(false,x));
          
        })


      /*var campaignCreatives = entered
        .insert("tr").classed("creatives hidden",true)
        .append("td")
        .attr("colspan",42)
        .append("div").classed("list-group campaign-creatives",true)
        .style("margin-top","10px")
        */

      campaign.buildRow(newRow);
      newRow.sort(function(x,y){
        xa = (x.state == "active") ? 1 : 0
        ya = (y.state == "active") ? 1 : 0 
        return ya - xa
      })
      //campaign.buildCreativeGroup(campaignCreatives)

      //UI.targeting.budget(entered.insert("tr").classed("hidden",true))
      
      tableRow.exit().remove();
    }

    campaign.modifyCreativeCount = function() {
      d3.selectAll("tr.campaign").selectAll(".creatives")
        .text(function(data){
          var num = data.creatives.filter(function(x){return x.attached}).length || 0
          return num ? num + " (update)" : "Add creatives!"
        })
    }

    campaign.buildCreativeGroup = function(wrapper) {

      wrapper.append("div")
        .classed("list-group-item",true)
        .append("h5")
        .classed("list-group-item-heading",true)
        .text("Associated Creatives")
      
      var group = wrapper.selectAll(".creative-group-wrapper")
        .data(function(d){
          return d3.nest().key(function(x){return x.folder.name || "Default"})
            .entries(d.creatives)
        })
        .enter()
          .append("div")
          .classed("list-group-item creative-group-wrapper",true)


      group.append("div").append("input")
        .property("type","checkbox")
        .style("float","left")
        .style("margin-right","15px")
        .property("checked",function(x){
          return x.values.filter(function(c){return c.attached}).length == x.values.length
        })
        .on("click",function(x){
          var isChecked = d3.select(this).property("checked")
          d3.select(this.parentNode.parentNode).selectAll("input").property("checked",isChecked)
          d3.select(this.parentNode.parentNode).datum().values
            .map(function(z){
              z.attached = isChecked
            })
          
          x.values.map(function(z){ z.attached = isChecked })
          var profile = d3.select(this.parentElement.parentElement.parentElement).datum()
          withProfile(profile)
          //campaign.update.bind(this.parentNode.parentNode.parentNode)()
          //campaign.modifyCreativeCount()
        })

      group.append("div").classed("col-md-1",true)
        .style("float","right")
        .text("+")

      group.append("div").text(function(x){return x.key})
        .style("display","block")
        .on("click",function(){
          d3.select(this.parentNode).select("table").classed("hidden",function(){return !this.classList.contains("hidden")})
        })

      var campaignCreatives = group
        .append("table")
        .classed("table condensed hidden",true)

      var head = campaignCreatives.append("thead").append("tr")
      
      head.append("th").text("Creative size")
      head.append("th").text("Name")
      head.append("th").text("Sample")
      head.append("th").text("Include?")

      var crentry = campaignCreatives.append("tbody")
        .selectAll("tr")
        .data(function(x){
          return x.values || []
        })
        .enter()
          .append("tr")

      crentry.append("td")
        .text(function(x){return x.width + "x" + x.height})

      crentry.append("td")
        .text(function(x){return x.name})

      crentry.append("td")
        .append("img")
        .attr("src",function(x){return x.media_url_secure })
        .style("max-height","50px")
        .style("max-width","100%")

      crentry.append("td")
        .append("input").attr("type","checkbox")
        .property("checked",function(x){
          return x.attached
        })

      group.selectAll("table tbody tr td").selectAll("input")
        .on("click",function(x){
          x.attached = d3.select(this).property("checked")
          //campaign.update.bind(this.parentNode.parentNode.parentNode.parentNode.parentNode.parentNode)()
          campaign.modifyCreativeCount()
        })

      
    }

    campaign.buildRow = function(row) {
      var entries = ["name","state","remove"];
      var values = {
        "name": function(entry,data) {
          try {
            return data[entry].split("Yoshi | ")[1].split(" | ")[0]
          } catch(e) {
            return data[entry].split("Yoshi | ")[1]
          }
        },
        "state": function(entry,data) {
          return data[entry] 
        },
        "edit": function(entry,data) {
          //var num = data[entry].filter(function(x){return x.attached}).length || 0
          
          return "More"//num ? num + " (update)" : "Add creatives!"
        }
      }
      var titles = {
        "state": "Select state",
        "base_bid": "Enter bid",
        "daily_budget": "Enter budget",
        "comments": "Enter a comment",
        "edit": "Edit"
      }
  
      entries.map(function(entry) {
        if (titles[entry]) { 
          row.append("td")
            .append("a")
            .attr("href","#")
            .attr("data-name",entry)
            .attr("data-pk",function(x){return x.id})
            .attr("data-value",function(x){
              var fn = values[entry] 
              return fn ? fn(entry,x) : ""
            })
            .attr("data-title",titles[entry])
            .classed("editable editable-click",true)
            .classed(entry,true)
            .text(function(d){
              var fn = values[entry] 
              return fn ? fn(entry,d) : d[entry]
            })
        } else {
          row.append("td")
            .classed(entry,true)
            .text(function(d){
              var fn = values[entry] 
              return fn ? fn(entry,d) : d[entry]
            })
           
        }
      })
   
    }

    campaign.validate = {
      bid: function(value) {
        return (!$.isNumeric(value)) ?
          "Bid must be numeric": (parseInt(value) < 0 || parseInt(value) > 20) ?
          "Bid must be between 0 and 20": null
      },
      budget: function(value) {
        return (!$.isNumeric(value)) ? 
          "Budget must be numeric": (parseInt(value) < 0 || parseInt(value) > 500) ?
          "Budget must be between 0 and 500" : null
      }
    }

    campaign.update = function(resp, value) {
      var selection = d3.select(this),
        field = selection.attr("data-name"),
        data = selection.data()[0],
        id = "&id=" + data.id

      data[field] = value
      var data_copy = JSON.parse(JSON.stringify(data))
      data_copy.creatives = data_copy.creatives.filter(function(x){return x.attached})

      RB.AJAX.rockerbox.putCampaign(id,JSON.stringify({campaign:data_copy}))
    }

    var sendToServer = function(){console.log(arguments)}

    campaign.startEditable = function() {
      $.fn.editable.defaults.mode = 'popup';
      $('.state').editable({
        type: "select",
        showbuttons: false,
        source:[
          {value: "active", text: "active"}, 
          {value: "inactive", text: "inactive"}
        ],
        success: campaign.update
      });

      $('.base_bid').editable({
        type: "text",
        showbuttons: false,
        validate: campaign.validate.bid,
        success: campaign.update

      });

      $('.daily_budget').editable({
        type: "text",
        showbuttons: false,
        validate: campaign.validate.budget,
        success: campaign.update
      });

      $('.comments').editable({
        type: "text",
        showbuttons: false,
        success: campaign.update
      });

      $('.edit').on("click",function(x){
        d3.select($(this).parent().parent().next()[0])
          .classed("hidden",function(x){return !this.classList.contains("hidden")})
          .classed("active",function(x){return !this.classList.contains("hidden")})
        d3.select($(this).parent().parent().next().next()[0])
          .classed("hidden",function(x){return !this.classList.contains("hidden")})
          .classed("active",function(x){return !this.classList.contains("hidden")})
         

      })

      $(".remove")
        .addClass("glyphicon glyphicon-remove-circle")
        .css("display","table-cell")
        .css("padding-left","25px")
        .on("click",function(x){
          if (confirm("Are you sure you want to delete this campaign?")) {
            var selection = d3.select(x.currentTarget)
            var obj = { 
              "campaign":{
                "id": selection.data()[0].id,
                "state":"inactive",
                "comments":"deleted"
              }
            }
            RB.AJAX.rockerbox.putCampaign(
              "&id="+obj.campaign.id, 
              JSON.stringify(obj), 
              function(){ $(x.currentTarget).parent().remove() }
            )
          }
        })
    }


    return campaign
  })(UI.campaign || {})

  return UI
})(RB.yoshi.UI || {})


