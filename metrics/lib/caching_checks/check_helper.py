

def check_response(data):
    good_or_bad = False
    if 'response' in data.keys():
        good_or_bad = True if len(data.get('response', {}))>1 else False
    if 'similarity' in data.keys():
        good_or_bad = True if len(data.get('similarity', {}))>1 else False
    if 'hourly_visits' in data.keys():
        good_or_bad = True if len(data.get('hourly_visits', {}))>1 else False
    if 'hourly_domains' in data.keys():
        good_or_bad = True if len(data.get('hourly_domains', {}))>1 else False
    if 'before_categories' in data.keys():
        good_or_bad = True if len(data.get('before_categories', {}))>1 else False
    return good_or_bad
