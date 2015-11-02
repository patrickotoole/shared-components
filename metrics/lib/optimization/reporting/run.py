import matplotlib
matplotlib.use('Agg')

import sys
sys.path.append('../')
import optimization_reporting


if __name__ == "__main__":


	send_to =  'Spurs <spurs@rockerbox.com>'
	send_from = 'stephen@rockerbox.com'
	
	report_opt_log = optimization_reporting.EmailReport(send_to , send_from)
	
	report_opt_log.send_daily_report_advertiser()

	report_opt_rules = optimization_reporting.EmailReport(send_to , send_from)
	report_opt_rules.opt_rule_report()
