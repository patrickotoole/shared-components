function addMixpanelEvent(advertiserID, userID, eventName) {
  var admin = "False";
  $.getJSON("/intraweek?format=json&ioinfo=" + advertiserID, function(data){
    if (userID.indexOf("a_") === 0) {
      userID = "admin";
      admin = "True";
    }
    mixpanel.identify(advertiserID.toString() + "_" + userID);
    mixpanel.people.set({
        "$name": data[0].advertiser + "_" + userID,
        "$last_login": new Date(),
        "Advertiser": data[0].advertiser,
        "Admin": admin
    });
    mixpanel.track(eventName);
  });
}
