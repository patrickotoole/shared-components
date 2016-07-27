import pandas as pd
from link import lnk
import logging

QUERY = "select distinct * from domain_idf_only"

def write_to_sql_category(db,df):
    from lib.appnexus_reporting.load import DataLoader
    df = df.reset_index()
    loader = DataLoader(db)
    key = "domain"
    columns = df.columns
    #df = df[['domain', 'category_name', 'parent_category_name']]
    loader.insert_df(df,"domain_category_only",["domain"],columns)

def run(df, console):
    from appnexus_category import AppnexusCategory
    ac = AppnexusCategory(console)
    categories = ac.get_domain_category_name(df.head(100).domain.tolist())

    import time
    for i,_df in df.groupby(pd.np.arange(len(df))//100):
        logging.info("getting categories for batch %s" %i)
        if i:
            _cats = ac.get_domain_category_name([i for i in _df.domain.tolist() if len(i) < 30 and not i.startswith(".")])
            categories = pd.concat([categories,_cats])
            time.sleep(2)

    logging.info("got categories for %d domains" %len(df))

    logging.info("writing to sql")
    write_to_sql_category(db,categories)

if __name__ == "__main__":


    console = lnk.api.console
    db = lnk.dbs.crushercache
    df = db.select_dataframe(QUERY)

    run(df, console)
