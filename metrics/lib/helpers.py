import StringIO
import pandas
import ujson

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

    @staticmethod 
    def df_to_csv(self,df,*args):
        response = Convert.df_to_csv(df)
        self.write("<pre>%s</pre>" % response)
        self.finish()

    @staticmethod
    def df_to_json(self,df,*args):
        response = Convert.df_to_json(df)
        self.write(response)
        self.finish()
        

renderers = {
    "csv" : Render.df_to_csv,
    "json": Render.df_to_json
}

class decorators:
    @staticmethod
    def formattable(fn):
        
        def wrapped(self, *args,**kwargs):
            # should make this determine the request type
            # based on the mime/type
            _format = self.get_argument("format",False)

            resp = fn(self,*args,**kwargs)
            _renderer, data = resp.next()

            renderer = renderers.get(_format,_renderer)
            renderer(self,*data)

        return wrapped
     
