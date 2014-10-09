API_QUERY = "select * from %s where %s "
INSERT_QUERY = "INSERT INTO campaigntest_campaign_fixtures (%(fields)s) VALUES %(values)s"
DELETE_QUERY = "DELETE FROM campaigntest_campaign_fixtures where %s"
SELECT_QUERY = "SELECT * FROM campaigntest_campaign_fixtures where %s"

CAMPAIGN_QUERY = "select * from advertiser_campaign where campaign_id = %s"  
FIXTURE_QUERY = "select * from campaigntest_fixture where id = %s"   
SUITE_QUERY = "select * from campaigntest_suite where id = %s"    

def isnumeric(fn):
    def check_numeric(self,*args):
        for arg in args:
            if not unicode(arg).isnumeric():
                raise TypeError("arguments must be numeric")
        return fn(self,*args)

    return check_numeric

def exists(query,pos=None,message="Data is missing"):
    def check_exists(fn):
        def check(self,*args):
            _id = args
            if pos is not None:
                _id = args[pos]
            if len(self.db.select_dataframe(query % _id)) == 0:
                raise Exception(message)
            return fn(self,*args)

        return check
    return check_exists

def run_query(fn):
    def run(self,*args):
        result = fn(self,*args)
        self.db.execute(result)

    return run

class CampaignRelation(object):
    
    @exists(FIXTURE_QUERY,1,"Missing Fixture") 
    @exists(CAMPAIGN_QUERY,0,"Missing Campaign")
    @isnumeric
    @run_query
    def add_campaign_fixture(self,campaign,fixture):
        params = {
            "fields" : "`campaign_id`,`fixture_id`",
            "values" : "(%s, %s)" % (campaign,fixture)
        }
        return INSERT_QUERY % params

    @exists(SUITE_QUERY,1,"Missing Suite") 
    @exists(CAMPAIGN_QUERY,0,"Missing Campaign")  
    @isnumeric
    @run_query
    def add_campaign_suite(self,campaign,suite):
        params = {
            "fields" : "`campaign_id`,`suite_id`",
            "values" : "(%s, %s)" % (campaign,suite)
        }
        return INSERT_QUERY % params

    @exists(SELECT_QUERY % "`campaign_id` = %s and `suite_id` = %s ",None,"relationship doesnt exists") 
    @isnumeric
    @run_query
    def delete_campaign_fixture(self,campaign,fixture):
        where = "`campaign_id` = %s and `fixture_id` = %s " % (campaign,fixture)
        return DELETE_QUERY % where
         
    @exists(SELECT_QUERY % "`campaign_id` = %s and `suite_id` = %s ",None,"relationship doesn't exists")
    @isnumeric
    @run_query
    def delete_campaign_suite(self,campaign,suite):
        where = "`campaign_id` = %s and `suite_id` = %s " % (campaign,suite)
        return DELETE_QUERY % where
 
         
        
 
