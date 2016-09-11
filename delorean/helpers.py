def parse_segment_log(s):
    # schema: "uid,segment:value:expiration"
    _split = s.split(",")
    return {
        "uid": _split[0],
        "segment": _split[1].split(":")[0]
    }

def group_by_segment(values):
    # values: [{"segment":1,"uid":1},{"segment":1,"uid":1}]
    import pandas
    df = pandas.DataFrame(values).groupby("segment")['uid'].nunique().reset_index()
    return df.to_dict('records')
