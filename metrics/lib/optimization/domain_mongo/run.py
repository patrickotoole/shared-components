import sys
sys.path.append("../../bidder/")
sys.path.append("../opt_script/")

sys.path.append("../../")
import buffering_smtp_handler
import logging
import domain_whois
from datetime import datetime

TODAY = datetime.today().strftime('%y-%m-%d')

logger = logging.getLogger("opt")

if __name__ == "__main__":

	import logsetup
	logsetup.configure_log(subject="domain_whois")


	logger.info("Extracting whois data for %s" %TODAY)
	D = domain_whois.DomainWhois(TODAY, TODAY)
	
	D.load_domains()
	D.filter_domains()
	D.push_whois()
