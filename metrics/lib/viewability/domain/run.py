import logging
import pandas as pd
    
from analysis import DomainAnalysis
from link import lnk

pd.set_option('display.max_columns', 100)
pd.set_option('display.width', 100)


def get_domain_list_options(where="1=1"):
    QUERY = "select * from domain_list_viewability where %s" % where
    dlv = lnk.dbs.rockerbox.select_dataframe(QUERY)
    return dlv


def main():
    from lib.report.utils.loggingutils import basicConfig 
    from lib.report.utils.options import define
    from lib.report.utils.options import options
    from lib.report.utils.options import parse_command_line

    define("where",default="1=1")

    basicConfig(options={})
    parse_command_line()

    dlv = get_domain_list_options(options.where)
    
    an_c = lnk.api.console
    an_r = lnk.api.reporting
    rb_a = lnk.api.rockerbox
    rb_d = lnk.dbs.reporting

    for obj in list(dlv.iterrows()):
        #try:
            values = obj[1].to_dict()
            va = DomainAnalysis(an_c,an_r,rb_a,rb_d,**values)
            #va.missing_domains()
            #va.push_whitelist()
            #va.push_blacklist()
            va.push_bad_domains()
        #except Exception as e:
            logging.error("%s \n %s " % (str(e),str(obj)))
        

if __name__ == "__main__":
    main()
