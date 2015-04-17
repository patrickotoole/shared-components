### ASI auction runner

The purpose of this tool is to run ASI auctions so that we can debug specific pieces of inventory and investigate things like:
- price floors
- soft floors
- pacing
- campaign setup

#### Current functionality

Currently, we reoriented this tool around testing yoshi campaigns and debugging what is wrong based on the current campaign setup.

It takes all profile related information (assuming an inclusion property) and runs all full combinations of a campaign. 

For instance, if a campaign includes two placements and two size targets, four bid forms will be created and tested. The results will produce a json object like the following if it successfully found information about the campaign within the debug auction: 

```
{
    "bid_result": {
        "ad_format": "iframe",
        "adv": 434652,
        "an_placement_id": 905437,
        "an_user_id": 7440373686927816718,
        "auction_id": "1933788151452734455",
        "biased_bid": "5.0000",
        "bid_price": 4.1983333333,
        "bid_result": "W",
        "bidder_id": "2",
        "camp": 7700008,
        "campaign_id": 7700008,
        "country": "US",
        "creative_id": "24172883",
        "detail": "Creative 24172883 Chaos factor: 0.933 Cadence modifier: 200.000% (Unique advertiser) CPM Bid Valuation: Disabling cadence modifier for cost prediction Base CPM bid $5.000 Line Item Goal Valuation Opt key ca7700008:cr24172883:v142390:px487209 - no data Buyside expected:0.0 (opt not found). Bidding EAP No CPA goal thresholds set Choosing CPM payout method: $5.000 CPM Revenue predict: base phase Learn Type: LEARN_NONE",
        "ext_auction_id": "1370929674738973998",
        "gross_bid": "5.0000",
        "gross_wining_price": "5.000",
        "height": 600,
        "highest_net_bid": "5.000",
        "ip_address": "98.116.7.78",
        "is_valid": true,
        "li": 1850572,
        "net_winning_price": "5.000",
        "our_creative": 24172883,
        "page_url": "kayak.com",
        "pri": 5,
        "profile_id": 25359142,
        "result": "chose cr 24172883 for $5.000 ($5.000 net)",
        "second_net_price": "4.0000",
        "soft floor": "1.165",
        "status": "SOLD",
        "width": 160,
        "winning_bid": "5.0000",
        "winning_member_id": "2024"
    },
    "timestamp": 1429230297
}
```

If it does not find appropriate information, it will product an object like the following:

```
{
    "bid_result": {
        "ad_format": "iframe",
        "an_placement_id": 943962,
        "an_user_id": 7440373686927816718,
        "auction_id": "1144652949640687227",
        "biased_bid": "4.9578",
        "bid_result": "M",
        "bidder_id": "2",
        "campaign_id": 7700008,
        "country": "US",
        "creative_id": "24172883",
        "ext_auction_id": "3353768710841188682",
        "gross_bid": "6.0000",
        "gross_wining_price": "6.000",
        "height": 600,
        "highest_net_bid": "4.958",
        "ip_address": "98.116.7.78",
        "is_valid": true,
        "net_winning_price": "4.958",
        "our_creative": {},
        "page_url": "kayak.com",
        "profile_id": 25359142,
        "second_net_price": "4.9578",
        "soft floor": "6.000",
        "status": "SOLD",
        "width": 160,
        "winning_bid": "4.9578",
        "winning_member_id": "2024"
    },
    "timestamp": 1429230298
}
```


#### Examples

To run for a particular campaign, line_item or advertiser, do the following:

```
python bidding.py --uid=7440373686927816718 --cid=7700008
```

Before running with advertiser or a line_item, you should probably first cache the API results first. This will limit the number of calls we make to the appnexus API and make the script run faster.

Use the below command to build the cache for an advertiser:
```
python bidding.py --uid=7440373686927816718 --aid=434652 --build_cache
```

After you have built the cache for the advertiser, you can then run debug auctions for the advertiser or the line_item using the either of the following two calls:

```
python bidding.py --uid=7440373686927816718 --aid=434652 --use_cache
python bidding.py --uid=7440373686927816718 --lid=1850572 --use_cache 

```


Note that for line_item and advertiser, we include the use_cache parameter to limit abuse of the appnexus API.


#### Web example

To run ad-hoc for a single campaign via our API:

```
http://localhost:8080/admin/debug?campaign_id=7700008&uid=8525358879271627
```
