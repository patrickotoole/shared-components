from database import *
import logging

class DomainsAPI(DomainsDatabase):

    def crusher_authenticate(self, advertiser_id, base_url = 'http://beta.crusher.getrockerbox.com'):
        pixel_source_name = self.get_pixel_source_name(advertiser_id)        
        self.crusher.user = "a_%s" %pixel_source_name
        self.crusher.base_url = base_url
        self.crusher.authenticate()
    
    def get_from_hindsight(self, endpoint):
        resp = self.crusher.get(endpoint)
        return resp.json.get('domains')

    def get_mediaplans_from_hindsight(self, endpoints, advertiser_id):
        logging.info("Pulling data from hindsight for %s"%advertiser_id) 
        self.crusher_authenticate(advertiser_id)
        media_plans = {}

        for name, endpoint in endpoints.iteritems():
            logging.info("- %s" %name)
            logging.info(endpoint)
            media_plans[name] = self.get_from_hindsight(endpoint)
        return media_plans

    def get_domains_queue(self, advertiser_id):

        media_plans = self.get_media_plan_endpoints(advertiser_id)
        yoshi_setup = self.get_yoshi_setup(advertiser_id)
        setups = pd.merge(yoshi_setup, media_plans, left_on = 'mediaplan', right_on = 'name', how = 'inner')
        setups = setups[(setups['active']==1) & (setups['num_domains'] > 0) ]

        endpoints = setups.drop_duplicates('mediaplan').set_index('mediaplan')['endpoint'].to_dict()
        line_items = setups['line_item_name'].unique().tolist()

        mediaplans =  self.get_mediaplans_from_hindsight(endpoints, advertiser_id)
        created =  self.get_created_domains(line_items, advertiser_id)

        queue = pd.DataFrame()
        for k, row in setups.iterrows():

            domains = pd.DataFrame(mediaplans[row['mediaplan']])
            domains = domains[domains['domain'].apply(lambda x: x not in created[row['line_item_name']] )]
            domains['line_item_name'] = row['line_item_name']
            domains['mediaplan'] = row['mediaplan']
            queue = pd.concat([queue, domains])

        return queue