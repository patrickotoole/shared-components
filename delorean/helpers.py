def parse_segment_log(s):
    # schema: "uid,segment:value:expiration"
    _split = s.split(",")
    _split_segment = _split[1].split(":")
    return {
        "uid": _split[0],
        "segment": _split_segment[0],
        "segment_value": _split_segment[1]
    }

def group_by_segment(values, appnexus_names):
    # values: [{"segment_value":1,"segment":1,"uid":1},{"segment_value":1,"segment":1,"uid":1}]
    import pandas
    df = pandas.DataFrame(values).groupby(["segment","segment_value"])['uid'].nunique().reset_index()
    return df.merge(appnexus_names,on='segment',how="inner").to_dict('records')