import StringIO
import pandas
import ujson

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
     
