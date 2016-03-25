import tornado.web
import logging
import sys
import ujson
import stripe

from lib.helpers import *
from base import BaseHandler
from twisted.internet import defer

def insert_into_or_update(table,fields,keys=[]):
    field_string = "`" + "`,`".join(fields) + "`"
    values_string = ",".join(["'%s'" for f in fields])
    update_string = ",".join([ "`%s` = VALUES(`%s`)" % (f,f) for f in fields if f not in keys ])

    Q = "INSERT INTO %s (%s) VALUES (%s) ON DUPLICATE KEY UPDATE %s "
    return Q % (table,field_string,values_string,update_string)


class SubscriptionDatabase:

    def time_string(self):
        import datetime as dt
        return dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    @decorators.deferred
    def get_user_id(self,user_name):
        G = """SELECT id from user where username = '%s' """
        return self.db.select_dataframe(G % user_name).ix[0,'id']

    def get_customer_by_user_id(self,user_id):
        try:
            G = """SELECT customer_token from user_stripe_customer where user_id = '%s' """
            return self.db.select_dataframe(G % user_id).ix[0,'customer_token']
        except:
            return False



    @decorators.deferred
    def save_token(self,user_id,token):
        Q = insert_into_or_update("user_stripe_token",["user_id","stripe_token","last_activity"],["user_id"])
        prepped = Q % (user_id,token,self.time_string())
        logging.info(prepped)
        self.db.execute(prepped)
        return token

    @decorators.deferred
    def save_customer(self,user_id,token):
        Q = insert_into_or_update("user_stripe_customer",["user_id","customer_token","last_activity"],["user_id","customer_token"])
        prepped = Q % (user_id,token,self.time_string())
        logging.info(prepped)
        self.db.execute(prepped)
        return token

    @decorators.deferred
    def token_to_customer(self,user_name,user_id,token):
        stripe.api_key = "sk_test_RpJYn4slUZdYHpDrhbpapoko"
        
        try:
            customer_id = self.get_customer_by_user_id(user_id)
            if customer_id is False:
                customer = stripe.Customer.create(
                    source=token,
                    description= "%s - %s" % (user_name, user_id)
                )

                self.save_customer(user_id,customer.id)
                customer_id = customer.id

            logging.info(customer_id)
            return customer_id
 
        except stripe.error.CardError, e:
            logging.info(e)
            return False

    @decorators.deferred
    def bill_customer(self,user_id,customer_id,amount):
        billing = stripe.Charge.create(
            amount=amount,
            currency="usd",
            customer=customer_id
        )

        billing_id = billing.id
        response_json = ujson.dumps(billing.to_dict())

        Q = insert_into_or_update(
            "user_stripe_customer_billing",
            ["user_id","customer_token","billing_token","last_activity","status","amount_cents","response"],
            ["user_id","customer_token","billing_token"]
        )
        prepped = Q % (user_id,customer_id,billing_id,self.time_string(),billing.status,billing.amount,response_json)
        logging.info(prepped)
        self.db.execute(prepped)

        if billing.status == "succeeded":

            return True
        return False


        

        
        
        

    
        

class SubscriptionHandler(BaseHandler,SubscriptionDatabase):

    def initialize(self,db=None):
        self.db = db

    @defer.inlineCallbacks
    def save(self):
        obj = ujson.loads(self.request.body)

        token = obj['token']
        user_name = self.current_user

        user_id = yield self.get_user_id(user_name)
        token = yield self.save_token(user_id,token)
        customer = yield self.token_to_customer(user_name,user_id,token)

        if customer is not False:
            AMOUNT = obj['amount_cents']
            bill = yield self.bill_customer(user_id,customer,AMOUNT)

            if bill is True:
                self.write('{"success":true}')
                self.finish()
                return
            
        self.write('{"failure":true}')
        self.finish()
 


    @tornado.web.authenticated
    @tornado.web.asynchronous
    def post(self):
        self.save()
