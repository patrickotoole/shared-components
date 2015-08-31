var RB = RB || {}
RB.crusher = RB.crusher || {}

RB.crusher.permissions = (function(permissions) {

  var crusher = RB.crusher
  var cache = RB.crusher.cache
  
  var __check__ = function(name) {
    return cache.userPermissions.feature_permissions.filter(function(x) { return x.name == name}).length > 0
  }
  

  permissions.check_feature = function(name,callback) {

    crusher.subscribe.add_subscriber(["permissions"], function(){
      console.log("permissions for " + name + ": " + __check__(name))
      if (__check__(name)) callback()
    },"permissions",true,true)
  }

  return permissions.check_feature

})(RB.crusher.permissions || {})
