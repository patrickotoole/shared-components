def parse_event_name(pixel_name):
    if "All Pages" in pixel_name: return "view"
    if "Purchase" in pixel_name: return "purchase"
    if "Signup" in pixel_name: return "signup"
    if "Logged" in pixel_name: return "login"

    try:
        return pixel_name.split(" - ")[1].lower().replace(" ","_")
    except:
        return pixel_name.lower().replace(" ","_")

def compile(template,data,with_comment=False):
    fields = template.fields
    _template = template.template

    if with_comment:
        _template = "<!-- Rockerbox - %(segment_name)s -->\n" + _template + "\n<!-- Rockerbox - End Pixel -->"
   
    assert(len(set(fields).intersection(set(data.columns))) == len(fields),"missing fields %s" % (str(fields)) )

    compiled = [
        dict(j[fields].to_dict().items() + [("compiled",_template % j.to_dict())])
        for i,j in data.iterrows()
    ]
    return compiled


