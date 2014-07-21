class MaxmindLookup(object):
    """
    MaxmindLookup looks geo-location information base on the IP address of the 
    user.

    Args:
      maxmind_db (db): the wrapped database to pull fields from
    """

    def __init__(self,maxmind_db):
        self.db = maxmind_db

    def get(self,value):
        """
        Look up and format information associated with maxmind database

        Args:
          value (string): value to lookup on each redis server

        Returns:
          dict: describes whether the user is approved or not
        """
        ip_lookup = self.db.get(value)
        try:
            return {                                                                             
                "city": ip_lookup.get('city',{}).get('names',{}).get('en',""),
                "state": ip_lookup.get('subdivisions',[{}])[0].get('names',{}).get('en',""),
                "city_state": ip_lookup.get('city',{}).get('names',{}).get('en',"") + 
                    ", " + 
                    ip_lookup.get('subdivisions',[{}])[0].get('names',{}).get('en',""),
                "country": ip_lookup.get('country',{}).get('names',{}).get('en',""),
                "latitude": ip_lookup.get('location',{}).get('latitude'),
                "longitude": ip_lookup.get('location',{}).get('longitude')
            }
        except:
            return {}
