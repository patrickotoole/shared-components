import ujson

class APIHelpers(object):

    def assert_not_present(self,obj,exclude):
        has_cols = [ i for i in exclude if i in obj.keys() ]
        
        if len(has_cols) > 0:
            raise Exception("Cannot contain the following: %s" % ', '.join(required) )


    def assert_required(self,obj,required):
        has_cols = [ i for i in required if i in obj.keys() ]
        
        if len(has_cols) != len(required):
            raise Exception("required_columns: %s" % ', '.join(required) )

    def assert_required_params(self,required):
        missing = [key for key in required if self.get_argument(key,False) is False]
        if len(missing) > 0:
            raise Exception("Missing the following parameters: %s" % ",".join(missing) )
           

    def write_response(self,response, code="200"):
        obj = { }

        if code == "200":
            obj["response"] = response
            obj["status"] = "ok"
        elif code == "ERR":
            obj["error"] = response
            obj["status"] = "error"

        self.write(ujson.dumps(obj)) 
        self.finish()

