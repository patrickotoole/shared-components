"""
Handles conversion of a profile object to a bid form by reading from API or local cache
"""

PROFILE_TO_BIDFORM_MAP = [
    {"field":"country_targets","action":"country_action","key":"country", "profile_key":"country"},
    {"field":"dma_targets","action":"dma_action","key":"dma", "profile_key": "dma"},
    {"field":"size_targets","key":["width","height"], "profile_key":["width","height"],"grouped_key":"sizes"},
    {"field":"domain_targets","action":"domain_action","key":"page_url","profile_key":"domain"},
    {"field":"platform_placement_targets","action":"platform_placement_action","key":"an_placement_id","profile_key":"id"}, 
]
 

class ProfileCache(object):

    def __init__(self,campaign_id):

        self.campaign_id = campaign_id
        self.profile_id = False
        self.line_item_profile_id = False

    def _read_profile_cache(self):
        try:
            import ujson
            return ujson.loads(open("/tmp/profile_cache.json","r").read()) 
        except:
            return {}

    def _read_campaign_cache(self):
        try:
            import ujson
            return ujson.loads(open("/tmp/campaign_cache.json","r").read()) 
        except:
            return {}

    def _read_line_item_cache(self):
        try:
            import ujson
            return ujson.loads(open("/tmp/line_item_cache.json","r").read()) 
        except:
            return {}

     
    @property
    def profile_cache(self):
        if not hasattr(self,"_profile_cache"):
            self._profile_cache = self._read_profile_cache()

        return self._profile_cache

    @property
    def campaign_cache(self):
        if not hasattr(self,"_campaign_cache"):
            self._campaign_cache = self._read_campaign_cache()

        return self._campaign_cache
     
    @property
    def line_item_cache(self):
        if not hasattr(self,"_line_item_cache"):
            self._line_item_cache = self._read_line_item_cache()

        return self._line_item_cache
    
    def write_cache(self):
        import ujson

        profiles = self._read_profile_cache()
        campaigns = self._read_campaign_cache()
        line_items = self._read_line_item_cache()

        with open("/tmp/profile_cache.json", 'w+') as f:
            combined = dict(profiles.items() + self.profile_cache.items())
            f.write(ujson.dumps(combined))

        with open("/tmp/campaign_cache.json", 'w+') as f:
            combined = dict(campaigns.items() + self.campaign_cache.items())
            f.write(ujson.dumps(combined))
  
        with open("/tmp/line_item_cache.json", 'w+') as f:
            combined = dict(line_items.items() + self.line_item_cache.items())
            f.write(ujson.dumps(combined))
         

    def cached_campaign(self):
        return self.campaign_cache.get(str(self.campaign_id),False)

    def cached_profile(self):
        return self.profile_cache.get(str(self.profile_id),False)

    def cached_line_item(self):
        return self.line_item_cache.get(str(self.line_item_id),False)

    def cached_line_item_profile(self):
        return self.profile_cache.get(str(self.line_item_profile_id),False)

         
class ProfileAPI(object):

    def __init__(self,console=False):
        from link import lnk
        self._console = console

    @property
    def console(self):
        if not self._console:
            from link import lnk
            self._console = lnk.api.console
        return self._console
 

    def get_profile(self,profile_id):
        return self.console.get("/profile?id=%s" % profile_id).json['response']['profile']

    def get_campaign(self,campaign_id):
        return self.console.get("/campaign?id=%s" % campaign_id).json['response']['campaign']

    def get_line_item(self,line_item_id):
      return self.console.get("/line-item?id=%s" % line_item_id).json['response']['line-item']
 
class BidProfile(ProfileCache,ProfileAPI):

    def __init__(self,campaign_id,console=False,use_cache=True):

        self.campaign_id = campaign_id
        self.use_cache = use_cache

        self.profile_id = False
        self.line_item_id = False
        self.line_item_profile_id = False

        self._console = console

    @property
    def campaign(self):
        campaign = self.cached_campaign() if self.use_cache else False

        if not campaign:
            campaign = self.get_campaign(self.campaign_id)
            self.campaign_cache[str(self.campaign_id)] = campaign

        return campaign

    @property
    def profile(self):

        if not self.profile_id:
            self.profile_id = self.campaign['profile_id']
            if self.profile_id is None:
                import logging
                logging.warn("WARNING: BAD CAMPAIGN %s: no profile attached" % self.campaign['id'])
                return {}

        profile = self.cached_profile() if self.use_cache else False
        
        if not profile:
            profile = self.get_profile(self.profile_id)
            self.profile_cache[str(self.profile_id)] = profile

        return profile

    @property
    def line_item(self):
        if not self.line_item_id:
            self.line_item_id = self.campaign['line_item_id']
         
        line_item = self.cached_line_item() if self.use_cache else False 

        if not line_item:
            line_item = self.get_line_item(self.line_item_id)
            self.line_item_cache[str(self.line_item_id)] = line_item

        return line_item
     
    @property
    def line_item_profile(self):

        if not self.line_item_profile_id:
            self.line_item_profile_id = self.line_item['profile_id']
            if self.line_item_profile_id is None:
                import logging
                logging.warn("WARNING: BAD LINEITEM %s: no profile attached" % self.campaign['id'])
                return {}
             

        line_item_profile = self.cached_line_item_profile() if self.use_cache else False 

        if not line_item_profile:
            line_item_profile = self.get_profile(self.line_item_profile_id)
            self.profile_cache[str(self.line_item_profile_id)] = line_item_profile

        return line_item_profile


    
    @classmethod
    def combine_profile(self, camP, lineP):
        """
        need to combine two profile -- we set targetting in either a)
        campaign or b) lineitem (from wei)
        """
        def _get_pair():
            _ts = [k for k, v in camP.iteritems() if 'targets' in k]
            _as = map(lambda t: t.replace('targets', 'action'), _ts)
            return zip(_ts, _as)
    
        pairs = _get_pair()
        for (target, action) in pairs:
            if lineP.get(target) and not camP.get(target):
                camP[target] = lineP[target]
                if action in camP:
                    camP[action] = lineP[action]
        return camP
     
    @property
    def total_profile(self):
        return self.combine_profile(self.profile,self.line_item_profile)

    @classmethod
    def profile_to_bidform_values(self,profile):
        """
        Takes a profile and produces values to use for bid_forms
        """

        and_fields = PROFILE_TO_BIDFORM_MAP
        form_values = {}

        for field in and_fields:
            values = profile.get(field['field'],False)
            if type(field['key']) is str and values:
                form_values[field['key']] = [v[field['profile_key']] for v in values] 
            elif type(field['key']) is list and values:
                
                form_values[field['grouped_key']] = [
                    { field["key"][i]: v[k] for i,k in enumerate(field["profile_key"])} 
                    for v in values
                ]

        return form_values
        

    def bidform_values(self):
        """
        Uses (line_item + campaign) profile to make all possible bid form combinations
        """
        return self.profile_to_bidform_values(self.total_profile)

    @classmethod
    def values_to_bidforms(self,values):
        """
        Takes bid form values dict and produces all possible combinations of bid_forms
        :values: dict
        
        {
          "key": [values],
          "key2": [{values}]
        }
        :return: list(dict)
        
        [{key":"v","key2":"x"},{"key":"v2","key2":"x2"}]
        """
        import copy        
        x = [{}]
        form_items = values.items()
        for key, values in form_items:
            l = len(x)
            for item in values:
                i = 0
                while i < l:
                    c = copy.copy(x[i])
                    if type(item) is dict:
                        c.update(item)
                    else:
                        c[key] = item
                    i += 1
                    x.append(c)


        expected_length = sum([len(i[0].keys()) if type(i[0]) is dict else 1 for k,i in form_items])

        return [d for d in x if len(d.keys()) == expected_length]

    @property
    def bidforms(self):
        """
        Returns bidforms for campaign
        """
        values = self.bidform_values()
        return self.values_to_bidforms(values)
        
