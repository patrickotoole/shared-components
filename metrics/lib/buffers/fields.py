RESULT = ["domain","uid","seller","tag","uid","approved_user","creative","advertiser_id","price","city","state","city_state","country","latitude","longitude","auction_id","campaign_id"]
DEBUG = ["second_price", "count", "50%", "$mod", "gross_bid", "biased_bid", "min", "max", "%mod2", "winning_bid", "win_price", "25%", "std", "total", "soft_floor", "75%", "$mod2", "mean", "%mod", "gross_win_price", "second_price_calc"]
INFO = ["brand_id", "result", "pub", "ecp", "ip_address", "referrer", "venue", "debug"]

COLUMN_OBJECTS = {
    "debug":DEBUG,
    "result":RESULT,
    "info":INFO
}
COLS = COLUMN_OBJECTS.keys()


