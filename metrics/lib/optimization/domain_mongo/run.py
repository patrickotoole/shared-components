import sys
sys.path.append("../../bidder/")
sys.path.append("../opt_script/")

sys.path.append("../../")
import buffering_smtp_handler
import logging
import domain_whois
import domain_visibility
from datetime import datetime, timedelta

TODAY = datetime.today().strftime('%y-%m-%d')
START_HOUR = (datetime.today() - timedelta(hours = 7)).strftime('%H')
END_HOUR = datetime.today().strftime('%H')

logger = logging.getLogger("opt")

if __name__ == "__main__":

    import logsetup
    logsetup.configure_log(subject="domain_whois")

    logger.info("Extracting whois data for %s" %TODAY)
    D = domain_whois.DomainWhois(TODAY, TODAY, START_HOUR, END_HOUR)
    
    D.load_domains()
    D.clean_domains()
    D.filter_domains()
    D.push_whois()