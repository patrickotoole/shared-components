import geo_domainlist


if __name__ == "__main__":

	domain_list_id = 414939
	G = geo_domainlist.DomainWhoisGeo(domain_list_id)
	G.load_data()
	G.filter()
	G.push()


