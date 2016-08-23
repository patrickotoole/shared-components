import ujson
import md5

class ShareDatabase:

    def lookup_nonce(self,nonce):
        has_nonce = self.db.select_dataframe("SELECT * FROM action_dashboard_share where nonce = '%s'" % nonce)
        return len(has_nonce)

    def make_share(self,advertiser_id,obj):
        nonce = md5.new(ujson.dumps(obj)).hexdigest()
        I = "INSERT INTO action_dashboard_share (advertiser_id,endpoint_allowed,nonce) VALUES ('%s','%s','%s') "
        for ep in obj['urls']:
            self.db.execute( I % (advertiser_id,ep,nonce) )

        return nonce
