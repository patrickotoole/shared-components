import ujson



class CreationApi(DomainsDatabase):


	def post(self):
		advertiser_id = self.get_query_argument("advertiser")
		data = json.loads(self.request.body).get('data')


		yoshi_obj = YOSHI_BASE % data

		self.crusher_authenticate(advertiser_id = advertiser_id, base_url = "http://portal.getrockerbox.com")
		self.crusher.post("/campaign?format=json", data = ujson.dumps(data))





