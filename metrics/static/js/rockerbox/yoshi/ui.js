var RB = RB || {}
RB.yoshi = RB.yoshi || {}

RB.yoshi.UI = (function(UI){

  UI.flash = function(msg) {
    var flash = d3.selectAll(".flash")
    console.log(msg) 
    if (msg) {
      flash.style("visibility","visible").style("color","red").html(msg)
    } else {
      flash.style("visibility","hidden").html("")
    }

  }

  UI.buttons = (function(buttons) {

    buttons.advertiser = function(target,name) {
      var advertisers = target.selectAll("span")
        .data([name])
      
      advertisers.enter()
       .append("span")     
       .html(function(x){return x})

      advertisers.html(function(x){return x})
 
    }

    buttons.help = function(target) {
      target.append("a")
        .attr("href","http://rockerbox.com/wiki/#!yoshi.md")
        .attr("target","_blank")
        .text("Help")
    }

    buttons.history = function(target) {
      target.append("a")
        .attr("id","history_button")
       
        .attr("type","button")
        .style("padding","10px")
        .style("height","30px")
        .html('<svg height=30 fill=white id="gear_layer" x="0px" y="0px" viewBox="0 0 24 24" enable-background="new 0 0 24 24" xml:space="preserve"> <path d="M20,14.5v-2.9l-1.8-0.3c-0.1-0.4-0.3-0.8-0.6-1.4l1.1-1.5l-2.1-2.1l-1.5,1.1c-0.5-0.3-1-0.5-1.4-0.6L13.5,5h-2.9l-0.3,1.8  C9.8,6.9,9.4,7.1,8.9,7.4L7.4,6.3L5.3,8.4l1,1.5c-0.3,0.5-0.4,0.9-0.6,1.4L4,11.5v2.9l1.8,0.3c0.1,0.5,0.3,0.9,0.6,1.4l-1,1.5  l2.1,2.1l1.5-1c0.4,0.2,0.9,0.4,1.4,0.6l0.3,1.8h3l0.3-1.8c0.5-0.1,0.9-0.3,1.4-0.6l1.5,1.1l2.1-2.1l-1.1-1.5c0.3-0.5,0.5-1,0.6-1.4  L20,14.5z M12,16c-1.7,0-3-1.3-3-3s1.3-3,3-3s3,1.3,3,3S13.7,16,12,16z"/> </svg>') 
        .on("click", function() { 
          // port.sendMessage({"action":"START_HISTORY"}) 
          chrome.tabs.create({'url': 'history.html'}, function(tab) {})
        })
    }

    buttons.update_campaign = function(target) {
      target.append("a")
        .attr("id","campaign_button")
        .classed(" btn btn-default btn-success",true)
        .attr("type","button")
        .text("Update Campaign")
        .on("click",function(){
          var current = d3.select(this)
          current.classed("btn-success",false)

          console.log("UPDATE CAMPAIGN"); 
          var callback = function(response, xhr) {
            current.classed("btn-success",true)
            var msg = (xhr.status == 200) ? "Successfully created campaign!" : "Error creating campaign."
            RB.yoshi.UI.flash(msg)
          }

          RB.yoshi.controller.updateCampaign(callback)
          
        })
    }

    buttons.validated_campaign = function(target) {
      target.append("a")
        .attr("id","campaign_button")
        .classed(" btn btn-default btn-success",true)
        .attr("type","button")
        .text("Create Campaign")
        .on("click",function(){
          var current = d3.select(this)
          current.classed("btn-success",false)

          var callback = function(response, xhr) {
            current.classed("btn-success",true)
            var msg = (xhr.status == 200) ? "Successfully created campaign!" : "Error creating campaign."
            RB.yoshi.UI.flash(msg)
          }

          RB.yoshi.controller.createCampaign(callback)
          
        })
    }        

    buttons.campaign = function(target) {
      target.append("a")
        .attr("id","campaign_button")
        .classed(" btn btn-default btn-success",true)
        .attr("type","button")
        .text("Create Campaign")
        .on("click",function(){
          var current = d3.select(this)
          current.classed("btn-success",false)

          var selected = d3.selectAll(".build tbody > tr") 
            .filter(function(x){ 
              return d3.select(this).selectAll("input").property("checked")
            })

          var data = selected.data()

          var profile = RB.yoshi.actions.buildCampaign(data)
          var isvalid = !RB.yoshi.actions.validateCampaign(profile)
          if (isvalid) {

            var callback = function(response, xhr) {
              current.classed("btn-success",true)
              var msg = (xhr.status == 200) ? "Successfully created campaign!" : "Error creating campaign."
              RB.yoshi.UI.flash(msg)
            }



            console.log(profile)
            // TODO: send this to the background page
            // don't run the ajax actions on the specific pages
            RB.AJAX.rockerbox.getUser(function(x){
              profile.details.username = x.username //HACK: for now this tells us which template to use
              RB.AJAX.rockerbox.postCampaign(JSON.stringify(profile),callback)
            })
            
          }
          
        })
    }

    buttons.show_campaigns = function(target) {
      target.append("a")
        .attr("id","campaign_history_button")
        .text("View Campaigns")
        .on("click",function(){
          chrome.tabs.create({'url': 'http://portal.getrockerbox.com/campaign'}, function(tab) {})
        })
    }

    buttons.clear_button = function(target) {
      target.append("a")
        .attr("id","clear_button")
        .text("Clear history")
        .on("click",function(){
          if (confirm("Are you sure you want to clear all data?")) {
            port.postMessage({action: "CLEAR_AD_DATA"});
          }
        })
    }
      

    buttons.help(d3.select("#help-link"))
    buttons.history(d3.select("#history-button-div"))
    buttons.campaign(d3.select("#campaign-button-div"))
    buttons.validated_campaign(d3.select("#validated-campaign-button-div")) 
    buttons.update_campaign(d3.select("#update-campaign-button-div"))  
    buttons.show_campaigns(d3.select("#campaign-history-button-div"))
    buttons.clear_button(d3.select("#clear_button_div"))
    
    return buttons
  })(UI.buttons || {})

  return UI
})(RB.yoshi.UI || {})
