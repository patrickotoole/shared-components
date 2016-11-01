# EXTRACT 

def load(path):
    import pandas
    df = pandas.read_csv(path)
    return df 

def load_profile_template(db,column_name,type):

    SELECT = """SELECT * FROM profile_templates where name = '%(column)s' and type = '%(type)s' """ % { "column": column_name, "type": type }
    df = db.select_dataframe(SELECT)
    if not len(df): return ""

    template = df.iloc[0].template

    return template

def load_campaign_template(db,name):

    SELECT = """SELECT * FROM campaign_templates where name = '%(name)s'""" % { "name": name }
    df = db.select_dataframe(SELECT)
    if not len(df): return ""

    template = df.iloc[0].template

    return template
