import ujson
from tornado import web
from adwords import AdWords

QUERY = "insert into advertiser_adwords_adgroup (advertiser_id, campaign_id, adgroup_id, bidamount) values (%s, %s, %s, %s)"

class AdGroupHandler(web.RequestHandler):
    def initialize(self, **kwarg):
        self.db = kwarg.get('db',None)
        self.adwords = kwarg.get('adwords',None)

    # List
    def get(self):
        advertiser_id = self.get_secure_cookie('advertiser')
        campaign_id = self.get_argument('campaign_id', '')
        
        response = self.adwords.read_adgroup(campaign_id,advertiser_id)
        if 'adgroups' in response.keys():
            data = ujson.loads(response['adgroups'])[2][1]
            tempdata = {}
            tempdata['data'] = []
            tempdata['campid'] = campaign_id
            for i in data:
                tempdata['data'].append({'id':i[0],'name':i[1],'status':i[2]})
        else:
            tempdata={'data':[],'campid':campaign_id}
        if 'json' in self.request.headers.get('Accept').split(',')[0]:
            self.write(ujson.dumps(tempdata))
        else:
            self.render("templates/adgroup.html",data=tempdata)

    # Create
    def post(self):
        camp_id = self.get_argument('campid',False)
        advertiser_id = int(self.get_secure_cookie('advertiser'))
        name = self.get_argument('name',False)
        bid_amount_str = self.get_argument('bidamount',False)
        #import ipdb; ipdb.set_trace()        
        bid_amount = float(bid_amount_str) * 1000000
        bid_amount = int(bid_amount)
        if not camp_id:
            post_data = ujson.loads(self.request.body)
            camp_id = post_data['campaign_id']
            name = post_data['name']
            bid_amount = post_data['bid_amount']

        arg = {
            'campaign_id': str(camp_id),
            'adgroup_name': str(name),
            'bid_amount': str(bid_amount)
        }
        response = self.adwords.create_adgroup(arg=arg, advertiser_id=int(advertiser_id))
        self.db.execute(QUERY, (advertiser_id, camp_id, response['id'], bid_amount))
        self.write(response)


    def put(self):
        advertiser_id = int(self.get_secure_cookie('advertiser'))
        post_data = ujson.loads(self.request.body)
        adgroup_id = post_data['adgroup_id']
        post_data.pop('adgroup_id')
        operations = [{
                    'operator': 'SET',
                    'operand': {
                        'id': adgroup_id,
                    }
                }]
        for key in post_data.keys():
            operations[0]['operand'][key] = post_data[key]
       
        client = self.adwords.get_adwords_client(advertiser_id)
        #import ipdb; ipdb.set_trace()
        ad_group_service = client.GetService('AdGroupService', version='v201607')

        try:
            resp = ad_group_service.mutate(operations)

            response = {"success":True, "AdGroupObject": ujson.dumps(resp)}
        except:
            response = {"success":"False", "Message": "Error when changing adgroup"}
        self.write(ujson.dumps(response))         
