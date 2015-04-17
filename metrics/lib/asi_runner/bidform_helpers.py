"""
Helper functions for getting every bid-request params except an_user_id.
"""

import random
import logging
from link import lnk



def advertiser_forms(advertiser_id,**kwargs):
    
    import ujson
    lineitems = ujson.loads(open("/tmp/line_item_cache.json").read())

    lids = [lineitem['id'] for k,lineitem in lineitems.items() if lineitem['advertiser_id'] == advertiser_id]
    forms = [lforms for lid in lids for lforms in lineitem_forms(lid,**kwargs)]

    return forms


def lineitem_forms(lineitem,**kwargs):

    import ipdb; ipdb.set_trace()

    c = lnk.api.console
    campaigns = c.get("/campaign?line_item_id=%s" % lineitem).json['response']['campaigns']

    import pandas
    cdf = pandas.DataFrame(campaigns)
    items = cdf.set_index("id").T.to_dict().items()
    import ipdb; ipdb.set_trace()
    #import ujson
    #campaigns = ujson.loads(open("/tmp/campaign_cache.json").read())

    cids = [k for k,campaign in items if campaign['line_item_id'] == lineitem]
    forms = [cforms for cid in cids for cforms in campaign_forms(cid, c,**kwargs)]  

    return forms

def campaign_forms(campaign_id, api=False, force=False, use_cache=True, **kwargs):
    kwargs['use_cache'] = use_cache
    logging.info("use cache: %s" % use_cache)
    return create_forms(campaign_id, api, **kwargs)

def create_forms(campaign_id, api=False, uid=None, use_cache=True, **kwargs):
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
        'ip_address': '98.116.7.78',
        'ad_format': 'iframe'
    }

    for form in forms:
        form['ext_auction_id'] = str(random.randint(LOW, HIGH))
        form.update(d)
    
    logging.info("created %s forms" % len(forms))
    return forms
