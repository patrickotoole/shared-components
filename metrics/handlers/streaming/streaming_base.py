import pandas
import sys

import lib.buffers.fields as fields
from lib.query.MYSQL import *
from lib.helpers import Mask, Convert
from buffer_base import BufferBase


def x_in_y(x,y):
    return [z for z in x if z in y]

def mask_data(df,masks):
    if masks and len(df) > 0:
        return df[Mask.isin_mask_dict(df,masks)]
    else:
        return df

class StreamingBase(BufferBase):
    
    def initialize(self,*args,**kwargs):
        self.db = kwargs.get("db",False)

        if self.db:
            self.creatives = self.db.select_dataframe(BRAND_QUERY)
            self.creatives['id'] = self.creatives.id.map(str)

        super(StreamingBase,self).initialize(*args,**kwargs)
    
    def merge_brand(self,df):
        return df.merge(self.creatives,how="left",left_on="creative",right_on="id")

    def build_basic(self,values):
        """
        Args:
          values (list): Takes a list of dictionaries.  All dictionaries require two keys 
            (auction_id, creatived 

        Returns:
          pandas.DataFrame: Will have auction_id as index, no null values.
        """
        df = pandas.DataFrame(values)
        if "creative" in df.columns:
            df = self.merge_brand(df)
            df = df.set_index("auction_id",drop=False)
        df = df.fillna(0)

        return df

    def dict_columns(self,df,column_dict={}):
        """
        Args:
          df (DataFrame): 
          column_dict (dictionary): 

        Returns:
          pandas.DataFrame: DataFrame is modified to have additional columns, specified by the keys from
            dictionary. The values within each columns are dictionaries whose key:values are defined by 
            the values from column_dict

        """
        for key,values in column_dict.iteritems():
            columns = x_in_y(values, df.columns)
            as_dict = df[columns].T.to_dict()
            df[key] = pandas.Series(as_dict)
        return df
        
    def build(self,values,column_objects=fields.COLUMN_OBJECTS):
        if len(values) == 0:
            return pandas.DataFrame(columns=column_objects.keys())

        df = self.build_basic(values)
        df = self.dict_columns(df,column_objects)

        return df

    def build_df(self,buffer_name):
        values = self.reset(buffer_name)
        if buffer_name in fields.COLUMN_OBJECTS.keys():
            column_objects = { buffer_name: fields.COLUMN_OBJECTS[buffer_name] }
        else:
            column_objects = fields.COLUMN_OBJECTS
        return self.build(values,column_objects)

    def mask_select_convert(self,df,masks,col=False):
        _df = mask_data(df,masks)
        _cols = x_in_y(fields.COLS, _df.columns)
        if col in _cols:
            return list(_df[col])
        return Convert.df_to_values(_df[_cols])



