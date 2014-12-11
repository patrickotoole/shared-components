function addMixpanelEvent(advertiserID, userID, eventName) {
  if (userID.indexOf("a_") !== 0) {
    $.getJSON("/intraweek?format=json&ioinfo=" + advertiserID, function(data){
      if (userID.indexOf("a_") === 0) {
        userID = "admin";
      }
        mixpanel.identify(advertiserID.toString() + "_" + userID);
        mixpanel.people.set({
            "$name": data[0].advertiser + "_" + userID,
            "$last_login": new Date(),
            "Advertiser": data[0].advertiser
        });
        mixpanel.track(eventName);
    });
  }
}
