var RB = RB || {}
RB.crusher = RB.crusher || {}

RB.crusher.permissions = (function(permissions) {

  var crusher = RB.crusher
  var cache = RB.crusher.cache
  var pubsub = crusher.pubsub;

  var __check__ = function(name) {
    return cache.userPermissions.feature_permissions.filter(function(x) { return x.name == name}).length > 0
  }


  permissions.check_feature = function(name,callback) {

    pubsub.subscriber("permissions",["permissions"])
      .run(function() {
        console.log("permissions for " + name + ": " + __check__(name))
        if (__check__(name)) callback()
      })
        .unpersist(true)
        .trigger()
  }

  return permissions.check_feature

})(RB.crusher.permissions || {})
