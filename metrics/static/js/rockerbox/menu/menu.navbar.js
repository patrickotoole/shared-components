RB = RB || {}
RB.menu = RB.menu || {}
RB.menu.navbar = (function(navbar) {

  var menu = RB.menu
  var LOGO_URL = "http://rockerbox.com/assets/img/general/logo-white.png"

  navbar.methods = {
    pushState: function(selectbar,x) {
      menu.navigation.reset()
      menu.navigation.forward(x)

      selectbar(x)
      return false
    }
  }

  navbar.components = {
    wrapper: function(target) {
      return d3_updateable(target,".side-navbar","nav")
        .classed("side-navbar",true)
    },
    logo: function(target,selectbar) {
      var logo_wrapper = d3_updateable(target,".logo","a")
        .classed("logo",true)
        .datum({"push_state":"/crusher/home","name":"Home"})

      d3_updateable(logo_wrapper,".logo-float","div")
        .classed("logo-float pull-right",true)
        .style("width","0px")
        .style("margin-left","-28px")
        .style("margin-right","28px")
        .style("margin-top","-5px")



      window.HW_config = {
        selector: ".logo-float", // CSS selector where to inject the badge
        account: "o7LZqy" // your account ID
      };

      d3_updateable(d3.select("head"),".widget-script","script")
        .classed("widget-script",true)
        .attr("type","text/javascript")
        .attr("src","https://cdn.headwayapp.co/widget.js")

      var logo_img_wrapper = d3_updateable(logo_wrapper,".logo-wrapper","a")
        .classed("logo-wrapper",true)
        .datum({"push_state":"/crusher/home","name":"Home"})


        
      return d3_updateable(logo_img_wrapper,"img","img") 
        .attr("src",LOGO_URL).style("max-height","70px")
        .on("click", navbar.methods.pushState.bind(this,selectbar)) 

    },
    items: function(target,selectbar) {
      var items = d3_splat( target, ".menu-item","a", function(x){return x},function(x) {return x.name})
        .classed("menu-item",true)
        .on("click", navbar.methods.pushState.bind(this,selectbar)) 
        .on("mouseover",function(){
          d3.select(this).classed("active",true)
            .select(".text").style("display","block")
            .style("visibility",undefined)

        })
        .on("mouseout",function(){
          d3.select(this).classed("active",false)
            .select(".text").style("display",undefined)
            .style("visibility","hidden")

        })

      d3_updateable(items,".icon","span")
        .attr("class",function(x) {return "icon " + (x.class || "")})
        .style("padding-right","21px")

      d3_updateable(items,".text","span")
        .classed("text",true)
        .style("visibility","hidden")
        .text(function(x){return x.name})

      return items
           
    },
    advertiser_switch: function(target) {

      var lower_buttons = d3_updateable(target, ".lower-buttons", "div")
          .classed("lower-buttons", true)
          .style("position","absolute")
          .style("bottom","20px")


      var documentation = d3_updateable(lower_buttons, ".menu-item.docs","a")
        .classed("menu-item docs",true)
        .on("click", function() {
          window.open("https://rockerboxwiki.atlassian.net/wiki/display/RA/Recency+Analytics+Home","__blank__")
        }) 
        .on("mouseover",function(){
          d3.select(this).classed("active",true)
            .select(".text").style("display","block")
            .style("visibility",undefined)

        })
        .on("mouseout",function(){
          d3.select(this).classed("active",false)
            .select(".text").style("display",undefined)
            .style("visibility","hidden")

        })

      d3_updateable(documentation,".icon","span")
        .attr("class",function(x) {return "icon " + "glyphicon glyphicon-book"})
        .style("padding-right","21px")

      d3_updateable(documentation,".text","span")
        .classed("text",true)
        .style("visibility","hidden")
        .text("Documentation")



      

      $.getJSON("/account/permissions", function(perm) {


	var permissions = perm["results"]['advertisers']
	var current_advertiser = permissions.filter(function(item){
          return item.selected
        })[0]

	var group_wrapper = d3_updateable(lower_buttons, ".btn-toolbar", "div")
	  .classed("btn-toolbar", true)
          .style("padding-top","10px")
	
	var dropdown_wrapper = d3_updateable(group_wrapper, ".btn-group", "div")
	  .classed("btn-group dropup", true)
	  .attr("id", "advertiser")
          .style("width","70px")
	
	var button_class = "btn btn-primary dropdown-toggle"

	var button = d3_updateable(dropdown_wrapper, button_class, "button")
	  .classed(button_class, true)
	  .attr("type", "button")
	  .attr("data-toggle", "dropdown")
	  .attr("aria-haspopup", "true")
	  .attr("aria-expanded", "false")
	  .style("display", "block")
	  .style("margin", "0 auto")
	  .style("width", "70px")
          .style("background-color","transparent")
          .style("border","none")
          .style("color","rgba(255,255,255,0.66)")

        d3_updateable(button,".icon","span")
          .classed("icon glyphicon glyphicon-user",true)

        d3_updateable(button,".advertiser","span")
          .classed("advertiser",true)
          //.text(current_advertiser["advertiser_name"])

        	
	//d3_updateable(button, ".caret", "span")
	//  .classed("caret", true)
        //  .style("margin-left","5px")

	var ul = d3_updateable(dropdown_wrapper, ".dropdown-menu", "ul")
	  .classed("dropdown-menu", true)

	d3_splat( ul, ".advertiser", "li", permissions, function(x){return x.external_advertiser_id})
	  .classed("advertiser", true)
	  .append("a")
	  .text(function(x){return x["advertiser_name"]})
	  .attr("value", function(x){return x["external_advertiser_id"]})
	  .on("click", function() {
	    var id = $(this).attr("value")
	    var payload = "{\"advertiser_id\":" + id + "}"
	    $.post("/account/permissions", payload, function() {
	      location.reload();
	      console.log(id);
	    })
	  })

	d3_updateable(ul, ".divider", "li")
	  .classed("divider", true)
	  .attr("role", "separator")

	d3_updateable(ul,".logout","li")
	  .append("a")
          .classed("logout",true)
          .text("Logout")
          .attr("href","/")
          .on("click",function(){
            document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';
            location.reload()
          })

	return dropdown_wrapper
      })
    }
  }

  navbar.render = function(target) {

    var wrapper = navbar.components.wrapper(target)
    //var selectbar = menu.selectbar.render(target) 
    navbar.components.advertiser_switch(wrapper)
    //navbar.components.logout(wrapper)
    navbar.components.logo(wrapper,menu.selectbar.render.bind(false,target))
    navbar.components.items(wrapper,menu.selectbar.render.bind(false,target))

    return navbar.components.items.bind(false,wrapper)
  }

  return navbar

})(RB.menu.navbar || {})
