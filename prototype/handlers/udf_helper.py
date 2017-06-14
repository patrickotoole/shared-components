
QUERY = "select body from prototype.user_defined_functions where udf='{}' and active=1 and deleted=0"

class UDFHandler():

    def get_udf(self,udf):
        code = self.prototype.select_dataframe(QUERY.format(udf))
        if code.empty:
            raise Exception("no udf available with that name")
        compiled_code = compile(code['body'][0].replace("import ", "raise Exception('no importations allowed')"), '<string>', 'exec')
        exec compiled_code in self._env

    def run_udf(self,udf, kwargs):
        code = self.get_udf(udf)
        try:
            resp = self._env[udf](**kwargs)
            return resp
        except Exception as e:
            logging.info(str(e))
            return None
