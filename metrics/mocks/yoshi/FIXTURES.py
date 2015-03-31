import copy

FAKE_ACTIVE_CAMPAIGN = {
    "id": 1,
    "name": "test",
    "base_bid": 1,
    "daily_budget": 100,
    "state": "active",
    "creatives": [],
    "comments": ""
}
FAKE_DELETED_CAMPAIGN = copy.copy(FAKE_ACTIVE_CAMPAIGN)
FAKE_DELETED_CAMPAIGN["comments"] = "deleted"
FAKE_DELETED_CAMPAIGN["state"] = "inactive" 
 
