from helpers import *
import ujson

GET = "select json from artifacts where advertiser = '%s' and key_name='%s'"
GETDEFAULT = "select json from artifacts where key_name='%s' and advertiser is null"
POST = "insert into artifacts (advertiser, key_name, json) values ('%s','%s', \"%s\")"
DELETE = "update artifacts set deleted=1 where advertiser=%s and key_name = %s"

class ArtifactsDatabase():

    def __init__(self,connectors={}):
        self.connectors = connectors 

    def get_advertiser_artifact(self,advertiser, artifact):
        df = self.connectors['crushercache'].select_dataframe(GET % (advertiser, artifact))
        try:
            data = df['json'][0]
        except:
            raise Exception("Artifact does not exist")
        return data

    def get_default_artifact(self,artifact):
        df = self.connectors['crushercache'].select_dataframe(GETDEFAULT % (artifact))
        try:
            data = df['json'][0]
        except:
            raise Exception("Artifact does not exist")
        return data

    def get_from_db(self,advertiser,artifact):
        if not advertiser:
            query_result = self.get_default_artifact(artifact)
        else:
            query_result = self.get_advertiser_artifact(advertiser, artifact)
        data = {"artifact":query_result}
        return data


    def post_to_db(self,advertiser, artifact, json):
        con = self.connectors['crushercache'].create_connection()
        json_data = process_post_json(json, con)
        try:
            self.connectors['crushercache'].execute(POST % (advertiser, artifact,json_data))
            resp = {"success":"True"}
        except:
            resp = {"error":"Malformed POST object. json key must be list or string without escape characters"}
        return resp

    def delete_from_db(self,advertiser, artifact):
        self.connectors['crushercache'].execute(DELETE, (advertiser, artifact))
        return {"success":"True"}
