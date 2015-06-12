import sys
sys.path.append("../../bidder/")
sys.path.append("../opt_script/")

sys.path.append("../../")
import buffering_smtp_handler
import logging
import domain_extract
from datetime import datetime, timedelta

START_DATE = (datetime.today() - timedelta(days = 14)).strftime('%y-%m-%d')
END_DATE = (datetime.today() - timedelta(days = 1)).strftime('%y-%m-%d')

logger = logging.getLogger("opt")

if __name__ == "__main__":

    import logsetup
    logsetup.configure_log(subject="domain_visibility_extract")


    logger.info("Extracting visibility data for %s to %s" %(START_DATE, END_DATE))
    V = domain_extract.DomainVis(START_DATE, END_DATE, True)
    V.load_domains()
    V.filter_domains()
    V.push()