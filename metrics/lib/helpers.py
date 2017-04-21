import StringIO
import pandas
import ujson
import urlparse
import logging
import signal

import datetime
import time
import random
import sys
import traceback

import gzip
import cStringIO
import twisted


UDF_EXCLUDES = ['submitted_by', 'base_url', 'advertiser', 'job_id', 'identifiers', 'func_name', 'udf', 'filter_id', 'pattern', 'priority', 'log_object']

def check_defer_list(defer_list):
    for res in defer_list:
        if res.__class__ is twisted.python.failure.Failure:
            raise Exception(str(res))


class Cast:
    @staticmethod
    def try_cast_list(cast,l,default="---"):
        def _cast(v):
            try:
                return cast(v)
            except:
                return default

        return map(_cast,l)

class Mask:

    @staticmethod
    def masks_in_df(df,masks):
        return { column: values 
            for column, values in masks.iteritems() 
                if column in df.columns 
        }

    @staticmethod
    def isin_mask_dict(df,masks={}):
        """
        # Takes a data frame and dictionary of values to make masks
        """
        
        mask = df.index == df.index
        in_df = Mask.masks_in_df(df,masks)
        
        len_masks_in_df = len(in_df.keys())

        
        if len(masks.keys()) == 0:
            # if nothing to mask
            return mask

        if len_masks_in_df < len(masks):
            # if we dont have the columns    
            return mask == False

        
        for column,values in masks.iteritems():

            # check for both integer and string values in columns
            values_int = Cast.try_cast_list(int,values)
            _mask = df[column].isin(values) | df[column].isin(values_int)

            mask = mask & _mask
            
        return mask

class Cast:
    @staticmethod
    def try_cast_list(cast,l,default="---"):
        def _cast(v):
            try:
                return cast(v)
            except:
                return default

        return map(_cast,l)

class Mask:

    @staticmethod
    def masks_in_df(df,masks):
        return { column: values 
            for column, values in masks.iteritems() 
                if column in df.columns 
        }

    @staticmethod
    def isin_mask_dict(df,masks={}):
        """
        # Takes a data frame and dictionary of values to make masks
        """
        
        mask = df.index == df.index
        in_df = Mask.masks_in_df(df,masks)
        len_masks_in_df = len(in_df.keys())

        
        if len(masks.keys()) == 0:
            # if nothing to mask
            return mask

        if len_masks_in_df == 0: # < len(masks):
            # if we dont have the columns    
            return mask == False

        
        for column,values in in_df.iteritems():

            # check for both integer and string values in columns
            values_int = Cast.try_cast_list(int,values)
            _mask = df[column].isin(values) | df[column].isin(values_int)

            mask = mask & _mask
            
        return mask





class Convert:

    @staticmethod
    def df_to_csv(df):
        io = StringIO.StringIO() 
        df.to_csv(io)
        csv = io.getvalue()
        io.close()
        return csv

    @staticmethod
    def df_to_values(df):
        # this is way faster than the built in .to_dict method
        _df = df.fillna(0)
        return list((dict(zip(_df.columns,j)) for j in _df.values))
 
    @staticmethod
    def df_to_json(df):
        l = Convert.df_to_values(df)
        return ujson.dumps(l)

    @staticmethod
    def grouped_df_to_nested(grouped,fn=False):
        fn = fn or Convert.df_to_values
        selection = grouped._selection_list
        d = {}
        for index, g in grouped:
            e = d
            for i in index[:-1]:
                e[i] = e.get(i,{})
                e = e[i]
            e[index[-1]] = fn(g[selection])
        return d

    @staticmethod
    def grouped_df_to_json(grouped):
        l = Convert.grouped_df_to_nested(grouped)
        return ujson.dumps(l)
        

class Render:

    def compress(self, buf):
        return Render.compressWrite(self, buf)

    @staticmethod
    def compressWrite(self, buf):
        if self.request.headers.get("Accept-Encoding","").find("gzip") != "-1":
            zbuf = cStringIO.StringIO()
            zfile = gzip.GzipFile(mode = 'wb',  fileobj = zbuf, compresslevel = 1)
            zfile.write(buf)
            zfile.close()
            self.set_header("Content-Encoding", "gzip")
            self.write(zbuf.getvalue())
        else:
            self.write(buf)
        self.finish()


    @staticmethod 
    def df_to_csv(self,df,*args):
        response = Convert.df_to_csv(df)
        if self._headers.get("Content-Disposition"):
            self.set_header("Content-Type", "text/csv");
        else:
            response = "<pre>%s</pre>" % response
        Render.compressWrite(self, response)

    @staticmethod
    def df_to_json(self,df,*args):
        response = Convert.df_to_json(df)
        if self._headers.get("Content-Disposition"):
            self.set_header("Content-Type", "application/json");
        Render.compressWrite(self, response)
        

renderers = {
    "csv" : Render.df_to_csv,
    "json": Render.df_to_json
}

class URL:

    @staticmethod
    def parse_domain(referrer):
        try:
            if referrer[:len(referrer)/2]*2 == referrer:
                referrer = referrer[:len(referrer)/2]
            t = referrer.split("//")
        except:
            t = [""]

        if len(t) > 1:
            t = [t[1]]

        d = t[0].split("/")[0].split("?")[0].split("&")[0].split(" ")[0].split(".")

        if len(d) < 3:
            domain = ".".join(d)
        elif len(d[-2]) < 4:
            domain = ".".join(d[-3:])
        else:
            domain = ".".join(d[-2:])
        
        return domain.lower()

class Parse:
    
    @staticmethod
    def qs(line):
        def param_helper(p):
            return p.split("?")[1] if "?" in p else p

        return {param_helper(i):j[0] for i,j in urlparse.parse_qs(line).iteritems()}

    



class decorators:

    @staticmethod
    def error_handling(func): 
        def inner(self, *args, **kwargs):
            try:
                self.time[str(self.__hash__)] = datetime.datetime.now()
            except:
                self.time={}
                self.time[str(self.__hash__)] = datetime.datetime.now()
            try:
                func(self, *args, **kwargs)
            except Exception as e:
                self.set_status(400)
                if "No users in segment" in e.message:
                    self.write(ujson.dumps({"error":"No users in segment"}))
                else:
                    self.write(ujson.dumps({"error":str(e)}))
                self.finish()
        return inner

    @staticmethod
    def multi_commit_cursor(func):

        def inner(self,*args,**kwargs):

            try:
                self.db.autocommit = False
                conn = self.db.create_connection()
                cur = conn.cursor()
                kwargs['cursor'] = cur

                result = func(self,*args,**kwargs)

                conn.commit()
            except Exception as e:
                import traceback
                traceback.print_exc()
                conn.rollback()
                raise e
            finally:
                self.db.autocommit = True

            return result
                
        return inner

    @staticmethod
    def meta_enabled(func):
        def inner(self, *args, **kwargs):
            include = self.get_argument("include","").split(",")
            meta_group = self.get_meta_group()
            meta_data = self.get_meta_data(meta_group,include)
            print args, kwargs
            if args and args[0]=="meta":
                self.write(ujson.dumps(meta_data))
                self.finish()
            else:
                return func(self, *args, **kwargs)
        return inner

    @staticmethod
    def help_enabled(func):
        def inner(self, *args, **kwargs):
            uri = '/'.join(self.request.uri.split("/")[:-1])
            formatted = self.get_argument("format",False)
            help_opt = self.get_argument("help", False)

            if len(args) == 0 or args[0] != "help":
                print args, kwargs
                return func(self, *args, **kwargs)

            if len(args) > 1 and args[1] == "all":
                help_data = self.get_help()
            else:
                help_data = {"meta_options": self.get_help()["meta_options"]}

            if formatted == "json":
                self.write(ujson.dumps(help_data))
                self.finish()
            else:
                self.render("admin/reporting/help.html",data=help_data, uri=uri)

        return inner
    
    @staticmethod
    def rate_limited(func):
        def inner(*args, **kwargs):
            r = func(*args, **kwargs)

            # Check for bad response
            if "status" not in r["response"] or "error" in r["response"]:
                raise Exception("Call to AppNexus did not succeed: " +
                                "{}".format(r["response"]["error"]))

            debug_info = r["response"]["dbg_info"]

            write_limit = debug_info["write_limit"]
            read_limit = debug_info["read_limit"]

            reads = debug_info["reads"]
            writes = debug_info["writes"]

            if writes >= write_limit:
                print "Sleeping for {} seconds".format(debug_info["write_limit_seconds"] + 2)
                time.sleep(debug_info["write_limit_seconds"] + 2)
                return r
            if reads >= read_limit:
                print "Sleeping for {} seconds".format(debug_info["read_limit_seconds"] + 2)
                time.sleep(debug_info["read_limit_seconds"] + 2)
                return r

            return r

        return inner


    @staticmethod
    def formattable(fn):
        
        def wrapped(self, *args,**kwargs):
            # should make this determine the request type
            # based on the mime/type
            _format = self.get_argument("format",False)
            _download = self.get_argument("download",False)

            if _download:
                self.set_header("Content-Disposition", "attachment")

            resp = fn(self,*args,**kwargs)
            _renderer, data = resp.next()

            renderer = renderers.get(_format,_renderer)
            renderer(self, *data)

        return wrapped

    @staticmethod 
    def time_log(fn):
        import time

        def wrap(*args,**kwargs):
            logging.info("Start %s" % (fn.__name__))
            start = time.time()
            _return = fn(*args,**kwargs)
            logging.info("Finished %s in %.4fs" % (fn.__name__,(time.time() - start)))
            return _return

        wrap.__name__ = fn.__name__
        return wrap

    @staticmethod
    def deferred(fn):
        from twisted.internet import threads

        def raiseError(failure):
            raise failure

        def deferred_fn(*args,**kwargs):
            d = threads.deferToThread(fn,*args,**kwargs)
            d.addErrback(raiseError)
            return d
        
        return deferred_fn

    @staticmethod
    def make_run_query(err_msg):
        def run_query(fn):
            
            def run(self,*args):
                db, q, params = fn(self,*args)
                df = db.select_dataframe(q % params)
                if df.empty:
                    raise Exception(err_msg % params)
                return df

            return run
        return run_query

    
    @staticmethod
    def retry(ExceptionToCheck, tries=10, timeout_secs=1.0, logger=None):
        """
        Retry calling the decorated function using an exponential backoff.
        """
        def deco_retry(f):
            def f_retry(*args, **kwargs):
                mtries, mdelay = tries, timeout_secs
                while mtries > 1:
                    try:
                        return f(*args, **kwargs)
                    except ExceptionToCheck as e:
                        #traceback.print_exc()
                        half_interval = mdelay * 0.10 #interval size
                        actual_delay = random.uniform(mdelay - half_interval, mdelay + half_interval)
                        msg = "Retrying in %.2f seconds ..." % actual_delay
                        if logger is None:
                            logging.exception(msg)
                        else:
                            logger.exception(msg)
                        time.sleep(actual_delay)
                        mtries -= 1
                        mdelay *= 2
                return f(*args, **kwargs)
            return f_retry  # true decorator
        return deco_retry
     
     
class validators:
    @staticmethod
    def pixel(fn):

        def wrapped(self, line, *args, **kwargs):
            split = line.split(" ")
            if len(split) < 2:
                return False

            return fn(self,split)

        return wrapped

class Model:
    @staticmethod
    def isnumeric(fn):
        def check_numeric(self,*args):
            for arg in args:
                if not unicode(arg).isnumeric():
                    raise TypeError("arguments must be numeric")
            return fn(self,*args)

        return check_numeric

    @staticmethod
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

    @staticmethod 
    def run_query(fn):
        def run(self,*args):
            result = fn(self,*args)
            self.db.execute(result)

        return run

    @staticmethod 
    def run_select(fn):
        def run(self,*args):
            result = fn(self,*args)
            return self.db.select_dataframe(result)

        return run
     
     
class timeout:
    def __init__(self, seconds=1, error_message='Timeout'):
        self.seconds = seconds
        self.error_message = error_message
    def handle_timeout(self, signum, frame):
        raise TimeoutError(self.error_message)
    def __enter__(self):
        signal.signal(signal.SIGALRM, self.handle_timeout)
        signal.alarm(self.seconds)
    def __exit__(self, type, value, traceback):
        signal.alarm(0)

class TimeoutError(Exception):
        pass


class APIHelpers(object):

    def assert_not_present(self,obj,exclude):
        has_cols = [ i for i in exclude if i in obj.keys() ]
        
        if len(has_cols) > 0:
            raise Exception("Cannot contain the following: %s" % ', '.join(exclude) )


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
        else:
            print code
            obj["error"] = response
            obj["status"] = "error"

        self.write(ujson.dumps(obj)) 
        self.finish()

