from analysis import DomainAnalysis

def main():
    from lib.report.utils.loggingutils import basicConfig 
    from link import lnk
    import pandas as pd
    pd.set_option('display.max_columns', 100)
    pd.set_option('display.width', 100)

    basicConfig(options={})
    dlv = lnk.dbs.rockerbox.select_dataframe("select * from domain_list_viewability")
    api = lnk.api.console
    reporting_db = lnk.dbs.reporting

    for obj in dlv.iterrows():
        va = DomainAnalysis(api,reporting_db,**obj[1].to_dict())
        va.push_whitelist()
        va.push_blacklist()
        print va.viewability_report[va.viewability_report.served < 1000].sort_index(by="served",ascending=False).head()

if __name__ == "__main__":
    main()
