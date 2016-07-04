
# GET PIXEL HELPERS

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


# CREATE PIXEL HELPERS

def an_seg_data(advertiser_name, segment_name):
    return {
        "segment":{ 
            "member_id":2024, 
            "short_name":advertiser_name + " - " + segment_name
        } 
    }

def seg_format_return(segment_id, advertiser_name, segment_name):
    return {
        "segment_id": segment_id,
        "segment_name": advertiser_name + " - " + segment_name
    }

def an_conv_data(advertiser_name,segment_name):
    return {
        "pixel": {
            "name": "%s - %s" % (advertiser_name, segment_name),
            "post_view_expire_mins": 720*60,
            "post_click_expire_mins": 720*60,
            "post_view_value": 1,
            "state": "active",
            "trigger_type": "hybrid"
        }
    }

def an_format_return(advertiser_id, pixel_id, segment_name):
    return {
        "external_advertiser_id": advertiser_id,
        "pixel_id": pixel_id,
        "pixel_display_name": segment_name,
        "pixel_name": segment_name,
        "pc_window_hours": 720*60,
        "pv_window_hours": 720*60
    }


