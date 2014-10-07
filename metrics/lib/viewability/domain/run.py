import logging
from analysis import DomainAnalysis

def main():
    from lib.report.utils.loggingutils import basicConfig 
    from link import lnk
    import pandas as pd
    pd.set_option('display.max_columns', 100)
    pd.set_option('display.width', 100)

    basicConfig(options={})
    dlv = lnk.dbs.rockerbox.select_dataframe("select * from domain_list_viewability")
    an_api = lnk.api.console
    rb_api = lnk.api.rockerbox
    reporting_db = lnk.dbs.reporting

    for obj in dlv.iterrows():
        va = DomainAnalysis(an_api,rb_api,reporting_db,**obj[1].to_dict())
        va.missing_domains()
        va.push_whitelist()
        va.push_blacklist()
        va.greylist
        

if __name__ == "__main__":
    main()
