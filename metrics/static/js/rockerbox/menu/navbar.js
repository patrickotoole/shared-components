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
    logo: function(target) {
      var logo_wrapper = d3_updateable(target,".logo","a")
        .classed("logo",true)
        
      return d3_updateable(logo_wrapper,"img","img") 
        .attr("src",LOGO_URL).style("max-height","70px")
    },
    items: function(target,selectbar) {
      return d3_splat( target, ".menu-item","a")
        .classed("menu-item",true)
        .text(function(x){return x.name})
        .on("click", navbar.methods.pushState.bind(this,selectbar)) 
           
    },
    logout: function(target) {
      var logo_wrapper = d3_updateable(target,".logout","a")
        .classed("logout",true)
        .style("bottom","0px")
        .style("position","absolute")
        .style("width","100%")
        
      return d3_updateable(logo_wrapper,"a.logout-item","a") 
        .classed("logout-item",true)
        .text("Logout")
        .attr("href","/logout")
        .on("click",function(){
          document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:01 GMT; path=/';
          location.reload()
        })
    }
  }

  navbar.render = function(target) {

    var wrapper = navbar.components.wrapper(target)
    //var selectbar = menu.selectbar.render(target) 
    navbar.components.logout(wrapper)
    navbar.components.logo(wrapper)
    navbar.components.items(wrapper,menu.selectbar.render.bind(false,target))

    return navbar.components.items.bind(false,wrapper)
  }

  return navbar

})(RB.menu.navbar || {})
