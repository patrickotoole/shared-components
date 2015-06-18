import sys
sys.path.append("../../bidder/")
sys.path.append("../opt_script/")
sys.path.append("../../")
import buffering_smtp_handler
import logging
import geo_domainlist

logger = logging.getLogger("opt")

if __name__ == "__main__":
    import logsetup
    logsetup.configure_log(subject="domain_list_opt")

    domain_list_id = 415511
    try:
        G = geo_domainlist.DomainWhoisGeo(domain_list_id)
        G.load_data()
        G.filter()
        G.push()
    except:
        e = sys.exc_info()[0]
        logger.error(e)


