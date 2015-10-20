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
        
      return d3_updateable(logo_wrapper,"img","img") 
        .attr("src",LOGO_URL).style("max-height","70px")
        .on("click", navbar.methods.pushState.bind(this,selectbar)) 

    },
    items: function(target,selectbar) {
      var items = d3_splat( target, ".menu-item","a", function(x){return x},function(x) {return x.name})
        .classed("menu-item",true)
        .on("click", navbar.methods.pushState.bind(this,selectbar)) 

      d3_updateable(items,".icon","span")
        .attr("class",function(x) {return "icon " + (x.class || "")})
        .style("padding-right","21px")

      d3_updateable(items,".text","span")
        .classed("text",true)
        .text(function(x){return x.name})

      return items
           
    },
    advertiser_switch: function(target) {
      $.getJSON("/account/permissions", function(perm) {
	var permissions = perm["results"]['advertisers']
	var current_advertiser = null

	for (var i = 0; i < permissions.length; i++){
	  if (permissions[i]["selected"]){
	    current_advertiser = permissions[i]
	    permissions.splice(i, 1)
	  }
	}

	var group_wrapper = d3_updateable(target, ".btn-toolbar", "div")
	  .classed("btn-toolbar", true)
	
	var dropdown_wrapper = d3_updateable(group_wrapper, ".btn-group", "div")
	  .classed("btn-group dropup", true)
	  .attr("id", "advertiser")
          .style("bottom","20px")
          .style("position","absolute")
          .style("width","100%")
	
	var button_class = "btn btn-primary dropdown-toggle"

	var button = d3_updateable(dropdown_wrapper, button_class, "button")
	  .classed(button_class, true)
	  .attr("type", "button")
	  .attr("data-toggle", "dropdown")
	  .attr("aria-haspopup", "true")
	  .attr("aria-expanded", "false")
	  .style("display", "block")
	  .style("margin", "0 auto")
	  .style("width", "100px")
          .style("background-color","transparent")
          .style("border","none")
          .style("color","rgba(255,255,255,0.66)")

        d3_updateable(button,".icon","span")
          .style("margin-left","12px")
          .style("padding-right","24px")
          .classed("icon glyphicon glyphicon-user",true)

        d3_updateable(button,".advertiser","span")
          .classed("advertiser",true)
          .text(current_advertiser["advertiser_name"])

        	
	d3_updateable(button, ".caret", "span")
	  .classed("caret", true)
          .style("margin-left","5px")

	var ul = d3_updateable(dropdown_wrapper, ".dropdown-menu", "ul")
	  .classed("dropdown-menu", true)

	d3_splat( ul, 
		  ".advertiser", 
		  "li", 
		  permissions, 
		  function(x){return x.external_advertiser_id})
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
