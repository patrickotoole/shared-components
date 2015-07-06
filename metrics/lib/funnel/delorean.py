from funnel_lib import Tree, FunnelMongoAPI, FunnelAPI

import logging
formatter = '%(asctime)s:%(levelname)s - %(message)s'
logging.basicConfig(level=logging.INFO, format=formatter)

logger = logging.getLogger()

class Runner:
    def __init__(self):
        self.api = FunnelAPI()
        
    def run(self, funnel_ids=None):
        funnels = self.api.get_funnels()
        pop = self.api.get_pop_domains()
        
        # If an array of funnel_ids is passed, limit this run to those ids
        if funnel_ids:
            funnels = [(i[0], i[1], i[2]) for i in funnels if i[2] in funnel_ids]

        for funnel in funnels:
            self.execute(pop, *funnel)

    def execute(self, pop, advertiser, funnel_name, funnel_id):
        domains = self.api.get_funnel_domains(funnel_name, advertiser)
        
        df = domains.append(pop)
        df = self.api.filter_df(df)
        
        logger.info("Total number of users: {}".format(len(df)))
        logger.info("Total number of converted users: {}".format(len(df[df.converted == "1"])))
        logger.info("Total number of not converted users: {}".format(len(df[df.converted == "0"])))
        
        tree = Tree(df, "domains", "converted")
        self.mongo_api = FunnelMongoAPI(tree)

        self.mongo_api.rules_to_query(advertiser, funnel_name, funnel_id)

funnel_ids = [111]

runner = Runner()

runner.run(funnel_ids)
