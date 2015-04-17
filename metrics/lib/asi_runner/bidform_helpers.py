"""
Helper functions for getting every bid-request params except an_user_id.
"""

import random
import logging
from link import lnk


def build_cache(advertiser_id):
    from bid_profile import ProfileCache
    c = lnk.api.console

    line_items = c.get_all_pages("/line-item?advertiser_id=%s" % advertiser_id,"line-items")
    profiles = c.get_all_pages("/profile?advertiser_id=%s" % advertiser_id,"profiles")
    campaigns = c.get_all_pages("/campaign?advertiser_id=%s" % advertiser_id,"campaigns")

    cache = ProfileCache(1)

    cache.profile_cache
    cache.campaign_cache
    cache.line_item_cache

    cache._profile_cache = { p['id']: p for p in profiles }
    cache._campaign_cache = { p['id']: p for p in campaigns } 
    cache._line_item_cache = { p['id']: p for p in line_items } 

    cache.write_cache()



def advertiser_forms(advertiser_id,**kwargs):
    
    import ujson
    lineitems = ujson.loads(open("/tmp/line_item_cache.json").read())

    lids = [lineitem['id'] for k,lineitem in lineitems.items() if lineitem['advertiser_id'] == advertiser_id and lineitem['state'] == "active"]
    forms = [lforms for lid in lids for lforms in lineitem_forms(lid,**kwargs)]

    return forms


def lineitem_forms(lineitem,**kwargs):

    c = None#lnk.api.console

    import ujson
    items = ujson.loads(open("/tmp/campaign_cache.json").read()).items()
     
    cids = [k for k,campaign in items if campaign['line_item_id'] == lineitem and campaign['state'] == 'active']
    forms = [cforms for cid in cids for cforms in campaign_forms(cid, c,**kwargs)]  

    return forms

def campaign_forms(campaign_id, api=False, force=False, use_cache=True, **kwargs):
    kwargs['use_cache'] = use_cache
    return create_forms(campaign_id, api, **kwargs)

def create_forms(campaign_id, api=False, uid=None, use_cache=True, ip_address="98.116.7.78", **kwargs):
    """

    :campaign_id: int
    :use_cach: bool
    :return: list(dict(form))
    """
    
    LOW = pow(10, 18)
    HIGH = pow(10, 19)
 
    import bid_profile
    p = bid_profile.BidProfile(campaign_id,api,use_cache)
    forms = p.bidforms

    d = {
        'an_user_id': uid,
        'is_valid': True,
        'campaign_id': campaign_id,
        'profile_id': p.profile.get('id'),
        'ip_address': ip_address,
        'ad_format': 'iframe'
    }

    for form in forms:
        form['ext_auction_id'] = str(random.randint(LOW, HIGH))
        form.update(d)
    
    logging.info("Campaign: %s, Created %s forms" % (campaign_id,len(forms)))
    return forms

