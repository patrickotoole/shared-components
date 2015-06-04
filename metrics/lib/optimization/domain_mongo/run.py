import domain_whois

if __name__ == "__main__":
	
	D = domain_whois.DomainWhois('15-06-03', '15-06-03', ['country'])
	
	D.load_domains()
	D.filter_domains()
	D.add_whois()
	D.push_data()
