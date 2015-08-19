class APIHelpers(object):

    def ensure_missing(self,obj,exclude):
        has_cols = [ i for i in exclude if i in obj.keys() ]
        
        if len(has_cols) > 0:
            raise Exception("Cannot contain the following: %s" % ', '.join(required) )


    def check_required(self,obj,required):
        has_cols = [ i for i in required if i in obj.keys() ]
        
        if len(has_cols) != len(required):
            raise Exception("required_columns: %s" % ', '.join(required) )

    def check_required_params(self,required):
        missing = [key for key in required if self.get_argument(key,False) is False]
        if len(missing) > 0:
            raise Exception("Missing the following parameters: %s" % ",".join(missing) )
           

    def write_response(self,response, code="200"):
        obj = { }

        if code == "200":
            obj["response"] = response
            obj["code"] = "ok"
        elif code == "ERR":
            obj["errorr"] = response
            obj["status"] = "error"

        self.write(ujson.dumps(obj)) 
        self.finish()

