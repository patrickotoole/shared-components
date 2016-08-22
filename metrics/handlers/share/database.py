import ujson
import md5

class ShareDatabase:

    def lookup_nonce(self,nonce):
        return False

    def make_share(self,advertiser_id,obj):
        nonce = md5.new(ujson.dumps(obj)).hexdigest()
        I = "INSERT INTO action_dashboard_share (advertiser,endpoint,nonce) VALUES ('%s','%s','%s') "
        for ep in obj['urls']:
            self.db.execute( I % (advertiser_id,ep,nonce) )

        return nonce
