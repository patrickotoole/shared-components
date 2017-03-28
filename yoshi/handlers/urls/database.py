import logging
import pandas as pd
from lib.appnexus_reporting import load
import MySQLdb

DOMAIN_LINKS = '''
SELECT * 
FROM yoshi_domain_links
WHERE domain IN %s
'''

def process_domain_string(domains):

    domains = domains.split(",")
    domains = [str(d) for d in domains]
    domains = str(domains).replace("[","(").replace("]",")")
    return domains

class UrlDatabase(object):

    def get_domain_links(self, domains):
        domains = process_domain_string(domains)
        return self.db.select_dataframe(DOMAIN_LINKS%domains)

    def insert_domain_links(self, data):
        df = pd.DataFrame(data)
        df['url'] = df['url'].apply(lambda x: MySQLdb.escape_string(x.decode('utf-8').encode('utf-8')))
        dl = load.DataLoader(self.db)
        dl.insert_df(data, "yoshi_domain_links",[], ["domain","url"])