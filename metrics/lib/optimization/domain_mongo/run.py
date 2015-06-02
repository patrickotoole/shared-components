import domain_meta

if __name__ == "__main__":
	
	D = domain_meta.DomainWhois('15-06-02', '15-06-02', ['country'])
	
	D.load_domains()
	D.filter_domains()
	D.extract_whois()
	D.insert()
