function addMixpanelEvent(advertiserID, userID, eventName) {
  if (userID.indexOf("a_") !== 0) {
    $.getJSON("/admin/api?table=advertiser&external_advertiser_id=" + advertiserID, function(data){
      if (userID.indexOf("a_") === 0) {
        userID = "admin";
      }
        mixpanel.identify(advertiserID.toString() + "_" + userID);
        mixpanel.people.set({
            "$name": data[0].advertiser_name + "_" + userID,
            "$last_login": new Date(),
            "Advertiser": data[0].advertiser_name
        });
        mixpanel.track(eventName);
    });
  }
}
