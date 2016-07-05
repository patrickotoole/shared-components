def an_advertiser_data(advertiser_name):
    return {
        "advertiser": {
            "name": advertiser_name, 
            "state": "active"
        } 
    }

def advertiser_insert_data(advertiser_id, advertiser_name, pixel_source_name):
    return {
        "advertiser_id": advertiser_id,
        "advertiser_name": advertiser_name,
        "pixel_source_name": pixel_source_name
    }

