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
    def bill_customer(self,user_id,customer_id,subscription_id,amount):
        billing = stripe.Charge.create(
            amount=amount,
            currency="usd",
            customer=customer_id,
            metadata= {"subscription_id": subscription_id}
        )

        billing_id = billing.id
        response_json = ujson.dumps(billing.to_dict())

        Q = insert_into_or_update(
            "user_stripe_customer_billing",
            ["user_id","customer_token","billing_token","subscription_id","last_activity","status","amount_cents","response","description"],
            ["user_id","customer_token","billing_token"]
        )
        prepped = Q % (user_id,customer_id,billing_id,subscription_id,self.time_string(),billing.status,billing.amount,response_json,"Subscription")
        logging.info(prepped)
        self.db.execute(prepped)

        if billing.status == "succeeded":
            prepped = "UPDATE subscription set active = 1 where subscription_id = %s" % subscription_id
            self.db.execute(prepped)
            return True
        return False

    def create_permissions(self,user_name,user_id,subscription_id,cursor=None):
        Q = "SELECT permissions_id from permissions_subscription where subscription_id = %s"
        permissions_id = self.db.select_dataframe(Q % subscription_id).ix[0,'permissions_id']
        logging.info("Found permissions: %s" % permissions_id)
        if not permissions_id:

            pixel_source_name = self.current_advertiser_name

            Q = insert_into_or_update("permissions",["name","last_activity"])
            prepped = Q % ("Subscription: %s" % pixel_source_name, self.time_string())
            cursor.execute(prepped)     
            permissions_id = cursor.lastrowid

            Q = insert_into_or_update(
                "permissions_subscription",
                ["permissions_id","subscription_id","last_activity"]
            )
            prepped = Q % (permissions_id,subscription_id,self.time_string())
            cursor.execute(prepped)     

            Q = insert_into_or_update(
                "permissions_advertiser",
                ["permissions_id","external_advertiser_id","last_activity"]
            )
            prepped = Q % (permissions_id,self.current_advertiser,self.time_string())
            cursor.execute(prepped)     

            Q = insert_into_or_update(
                "user_permissions",
                ["user_id","permissions_id","last_activity"]
            )
            prepped = Q % (user_id,permissions_id,self.time_string())
            cursor.execute(prepped)     

            logging.info("Created permissions: %s" % permissions_id)
        else:
            logging.info("Using previous permissions: %s" % permissions_id)


        return permissions_id




    @decorators.deferred
    @decorators.multi_commit_cursor
    def create_plan(self,user_name,user_id,amount,cursor=None):
        Q = "SELECT subscription_id, active from subscription where owner_user_id = %s"
        df = self.db.select_dataframe(Q % user_id)
        subscription_id = df.ix[0,"subscription_id"]
        active = df.ix[0,"active"]

        if not subscription_id or not active:
            pixel_source_name = self.current_advertiser_name

            Q = insert_into_or_update("subscription", ["name","owner_user_id","last_activity","amount_cents"])
            prepped = Q % ("%s - %s" % (user_name,pixel_source_name),user_id,self.time_string(),amount)
            logging.info(prepped)
            cursor.execute(prepped)
            subscription_id = cursor.lastrowid
            logging.info("Created / Updated subscription: %s" % subscription_id)
        else:
            logging.info("Using previous subscription: %s" % subscription_id)

        permissions_id = self.create_permissions(user_name,user_id,subscription_id,cursor)

        return (subscription_id, active)


    @decorators.deferred
    @decorators.multi_commit_cursor
    def disable_plan(self,user_name,user_id,cursor=None):
        Q = "SELECT subscription_id, active from subscription where owner_user_id = %s"
        df = self.db.select_dataframe(Q % user_id)
        subscription_id = df.ix[0,"subscription_id"]
        active = df.ix[0,"active"]

        if subscription_id and active:
            pixel_source_name = self.current_advertiser_name

            Q = "UPDATE subscription set active = 0 where owner_user_id = %s "
            prepped = Q % user_id
            logging.info(prepped)
            cursor.execute(prepped)

        return (subscription_id, active)


            

        

class SubscriptionHandler(BaseHandler,SubscriptionDatabase):

    def initialize(self,db=None):
        self.db = db

    @defer.inlineCallbacks
    def save(self):
        obj = ujson.loads(self.request.body)

        token = obj['token']
        AMOUNT = obj['amount_cents']
        user_name = self.current_user

        user_id = yield self.get_user_id(user_name)
        token = yield self.save_token(user_id,token)
        customer_id = yield self.token_to_customer(user_name,user_id,token)
        subscription_id, active_subscription = yield self.create_plan(user_name,user_id,AMOUNT)

        if active_subscription:
            self.write('{"error":"already have an active subscription"}')
            self.finish()
            return

        if customer_id is not False:
            
            bill = yield self.bill_customer(user_id,customer_id,subscription_id,AMOUNT)

            if bill is True:
                self.write('{"success":true}')
                self.finish()
                return
            
        self.write('{"failure":true}')
        self.finish()
 
    @defer.inlineCallbacks
    def unsubscribe(self):

        user_name = self.current_user
        user_id = yield self.get_user_id(user_name)

        subscription_id, active_subscription = yield self.disable_plan(user_name,user_id)
        self.write('{"success":true}')
        self.finish()

    @defer.inlineCallbacks
    def get_billing(self):

        user_name = self.current_user
        user_id = yield self.get_user_id(user_name)

        df = self.db.select_dataframe("SELECT last_activity date, description, amount_cents FROM user_stripe_customer_billing where user_id = %s and status = 'succeeded' " % user_id)
        self.write(ujson.dumps(df.to_dict('records')))
        self.finish()

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def get(self):
        self.get_billing()

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def post(self):
        self.save()

    @tornado.web.authenticated
    @tornado.web.asynchronous
    def delete(self):
        self.unsubscribe()
