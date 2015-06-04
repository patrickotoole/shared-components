import domain_whois
from datetime import datetime

TODAY = datetime.today().strftime('%y-%m-%d')

if __name__ == "__main__":
	print "date %s" %TODAY
	D = domain_whois.DomainWhois(TODAY, TODAY, ['country'])
	
	D.load_domains()
	D.filter_domains()
	D.add_whois()
	D.push_data()
