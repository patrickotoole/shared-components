from link.wrappers.dbwrappers import DBConnectionWrapper
import link.wrappers.defaults as defaults

class MysqlDB(DBConnectionWrapper):

    def __init__(self, wrap_name=None, user=None, password=None,
            host=None, database=None, port=defaults.MYSQL_DEFAULT_PORT,
            autocommit=True):
        """
        A connection for a Mysql Database.  Requires that
        MySQLdb is installed

        :param user: your user name for that database 
        :param password: Your password to the database
        :param host: host name or ip of the database server
        :param database: name of the database on that server 
        """
        self.user = user
        self.password = password
        self.host = host
        self.database = database
        self.port=port
        self.autocommit = autocommit
        super(MysqlDB, self).__init__(wrap_name=wrap_name)

    def execute(self, query, args = ()):
        """
        Creates a cursor and executes the query for you
        """
        import MySQLdb
        try:
            try:
                self._wrapped.close()
            except:
                pass
            with self.create_connection() as cursor:
                result = self.CURSOR_WRAPPER(cursor, query, args=args)()

                if "insert into" in query.lower():
                    return cursor.lastrowid
                    
                return result
        except MySQLdb.OperationalError, e:
            if e[0] == 2006:
                self._wrapped.close()
                self._wrapped = self.create_connection()
                cursor = self._wrapped.cursor()
                return self.CURSOR_WRAPPER(cursor, query, args=args)()

        return

    def batch_update(self, query_list, args = ()):
        """
        Creates a cursor and executes the query for you
        """
        import MySQLdb
        last_row_ids = []
        try:
            try:
                self._wrapped.close()
            except:
                pass

            try:
                self.autocommit = False
                conn = self.create_connection()
                cur = conn.cursor()
                for query in query_list:
                    cur.execute(query)
                    last_row_ids.append(cur.lastrowid)
                conn.commit()
            except Exception as e:
                print e
                conn.rollback()
                raise e
            finally:
                self.autocommit = True
                    
            return last_row_ids
        except MySQLdb.OperationalError, e:
            print e
            if e[0] == 2006:
                self._wrapped.close()
                self._wrapped = self.create_connection()
                cursor = self._wrapped.cursor()
                return self.CURSOR_WRAPPER(cursor, query, args=args)()
        

    def create_connection(self):
        """
        Override the create_connection from the DbConnectionWrapper
        class which get's called in it's initializer
        """
        import MySQLdb.connections
        import MySQLdb.converters
        import MySQLdb

        # make it so that it uses floats instead of those Decimal objects
        # these are really slow when trying to load into numpy arrays and 
        # into pandas
        conv = MySQLdb.converters.conversions.copy()
        conv[MySQLdb.constants.FIELD_TYPE.DECIMAL] = float
        conv[MySQLdb.constants.FIELD_TYPE.NEWDECIMAL] = float
        conn = MySQLdb.connect(host=self.host, user=self.user,
                               db=self.database, passwd=self.password,
                               conv=conv, port=self.port)
        if self.autocommit:
            conn.autocommit(True)
        return conn

    def use(self, database):
        return self.select('use %s' % database).data

    def databases(self):
        return self.select('show databases').data

    def tables(self):
        return self.select('show tables').data

    def now(self):
        # not sure that the [0][0] will always be true...but it works now
        return self.select('select now()').data[0][0]

    @property
    def command(self):
        """
        Here is the command for doing the mysql command
        """
        return  'mysql -A -u %s -p%s -h %s %s' % (self.user, self.password,
                                                     self.host, self.database)

