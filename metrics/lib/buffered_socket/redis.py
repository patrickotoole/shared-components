class RedisApprovedUID(object):
    """
    RedisApprovedUID looks up user specific information base on the UID and
    returns a dictionary object with information related to the user. It takes
    a list of redis servers to preform this lookup.

    Args:
      redis_list: a list of redis connectors to check for users information
    """

    def __init__(self,redis_list):
        self.redis_list = redis_list

    def get(self,value):
        """
        Look up to see if the value exists across multiple redis servers

        Args:
          value (string): value to lookup on each redis server

        Returns:
          dict: describes whether the user is approved or not
        """
        result = {}
        for redis_server in self.redis_list:
            result["approved_user"] = result.get("approved_user",False) or redis_server.get(value,False)
        return result
 
