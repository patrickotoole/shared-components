import domain_meta

if __name__ == "__main__":
	
	D = domain_meta.DomainWhois('15-06-03', '15-06-03', ['country'])
	
	D.load_domains()
	D.filter_domains()
	D.add_whois()
	D.insert()
