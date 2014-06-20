from link import Wrapper
from link.utils import list_to_dataframe
import link.wrappers.defaults

class DBCursorWrapper(Wrapper):
    """
    Wraps a select and makes it easier to tranform the data
    """
    def __init__(self, cursor, query = None, wrap_name = None, args=None):
        self.cursor = cursor
        self._data = None
        self._columns = None
        self.query = query
        self.args = args or ()
        super(DBCursorWrapper, self).__init__(wrap_name, cursor)
    
    @property
    def columns(self):
        if not self._columns:
            self._columns = [x[0].lower() for x in self.cursor.description]
        return self._columns
    
    @property
    def data(self):
        if not self._data:
           self._data = self.cursor.fetchall() 
        return self._data

    def as_dataframe(self):
        try:
            from pandas import DataFrame
        except:
            raise Exception("pandas required to select dataframe. Please install"  + 
                            "sudo easy_install pandas")
        columns = self.columns
        #check to see if they have duplicate column names
        if len(columns)>len(set(columns)):
            raise Exception("Cannot have duplicate column names " +
                            "in your query %s, please rename" % columns)
        return list_to_dataframe(self.data, columns) 
    
    def _create_dict(self, row):
        return dict(zip(self.columns, row)) 

    def as_dict(self):
        return map(self._create_dict,self.data)

    def __iter__(self):
        return self.data.__iter__()
    
    def __call__(self, query = None, args=()):
        """
        Creates a cursor and executes the query for you
        """
        args = args or self.args

        query = query or self.query
        #sqlite db does not take in args...so i have to do this
        #TODO: Create custom dbcursor wrappers for different database types
        self.cursor.ping()
        if args:
            self.cursor.execute(query, args=args)
        else:
            self.cursor.execute(query)

        return self
