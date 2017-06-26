from googleads import oauth2
from googleads import adwords
from oauth2client import client
import datetime
import httplib2
import ujson
import json
import logging
from link import lnk
import time
import uuid
import datetime
import StringIO
from RB import RB
QUERY = "Select advertiser_id, token, clientID from advertiser_adwords where deleted=0 and active=1"

class AdWordsAuth():
    def __init__(self,connectors):
        self.RB = RB()
        self.adwords_object = {}
        self.create_adwords_object(connectors['db'])

    def create_adwords_object(self,db):
        data = db.select_dataframe(QUERY)
        for item in data.iterrows():
            advertiser_id = int(item[1]['advertiser_id'])
            creds = ujson.loads(item[1]['token'])
            expired = datetime.datetime.strptime(creds['token_expiry'],'%Y-%m-%dT%H:%M:%SZ')
            clientID = item[1]['clientid']
            adwords_client = self.adwordsClient(creds,advertiser_id)
            self.adwords_object[advertiser_id] = {'expires': expired, 'client':adwords_client, 'token':creds, 'ID':clientID}

    def adwordsClient(self, token, advertiser_id):
        refresh_token = token['refresh_token']
        user_agent='Rockerbox'
        oauth2_client = oauth2.GoogleRefreshTokenClient(self.RB.client_id, self.RB.client_secret, refresh_token)
        adwords_client = adwords.AdWordsClient(self.RB.developer_token, oauth2_client, user_agent)
        customer_service = adwords_client.GetService('CustomerService', version='v201609')
        customers = customer_service.getCustomers()
        customer_id = customers[0].customerId
        if self.adwords_object.get(advertiser_id,None) is None:
            self.adwords_object[advertiser_id]={}
        self.adwords_object[advertiser_id]['ID'] = customer_id
        adwords_client.SetClientCustomerId(customer_id)
        return adwords_client

    def get_adwords_client(self,advertiser_id):
        try:
            adwords_client = self.adwords_object.get(advertiser_id,{"client":{}}).get('client',{})
            expires = self.adwords_object.get(advertiser_id,{"expires":{}}).get('expires', datetime.datetime.now())
            if adwords_client == {} or datetime.datetime.now() > expires:
                self.adwords_object[advertiser_id]['client'] = self.adwordsClient(self.adwords_object[advertiser_id]['token'], advertiser_id)
                self.adwords_object[advertiser_id]['expires'] = datetime.datetime.now() + datetime.timedelta(hours=1)
            adwords_client = self.adwords_object[advertiser_id]['client']
        except:
            raise Exception("Error getting adwords client")
        return adwords_client
