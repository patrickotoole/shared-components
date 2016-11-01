# TRANSFORM

def filter(filters,df):
    import pandas

    mask = pandas.Series([1]*len(df),index=df.index)

    for i, filter in filters.items():
        mask = mask & df.apply(filter,axis=1)

    return df[mask]



# BUILD
def create_campaign(row):
    assert "campaign_template" in row.index

    fields = {}
    import ujson
    template = row.campaign_template

    row['campaign'] = template % row.to_dict()

    return row['campaign']

def create_campaigns(df):

    df['campaign'] = ""

    for i, row in df.iterrows():
        df.ix[i,'campaign'] = create_campaign(row)

    return df['campaign']

def create_profile(row):
    assert "profile_template" in row.index

    fields = {}

    import ujson

    templates = ujson.loads(row.profile_template)

    for i,template in templates.items():
        vv = ujson.dumps(template) % row.to_dict()
        if (type(template) is not list) and (type(template) is not dict) and (template.startswith("[{")): vv = vv.replace("\\","")[1:-1]

        fields[i] = ujson.loads(vv)
        if (template == ujson.dumps(template)[1:-1]) : 
            try:
                fields[i] = eval(vv[1:-1])
            except:
                fields[i] = vv[1:-1]


    return ujson.dumps(fields)

def create_profiles(df):

    df['profile'] = ""

    for i, row in df.iterrows():
        df.ix[i,'profile'] = create_profile(row)

    return df['profile']

def create(df):
    cols = df.columns

    assert "campaign" in cols
    assert "profile" in cols

    df['campaign'] = create_campaigns(cols)
    df['profile'] = create_profiles(cols)

    return df
