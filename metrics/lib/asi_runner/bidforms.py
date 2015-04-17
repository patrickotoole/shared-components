import logging
import os

import ujson

from lib.report.debug.bidform_helpers import create_forms

DEFAULT_FORM_PATH = '/tmp/bidforms.json'

def get_bid_forms(use_cache=False, limit=None):
    """
    :use_cache:          bool
    :limit:              int
    :return:             list(dict)
    """
    if use_cache:
        try:
            return _get_bid_forms_local()
        except IOError:
            pass
    _update_bid_forms(limit=limit)
    return get_bid_forms(True)

def _get_bid_forms_local():
    with open(DEFAULT_FORM_PATH, 'r') as f:
        text = f.read()
        if not text:
            raise IOError
        forms = ujson.loads(text)
        logging.info("Fetched %s forms from local" % len(forms))
        return forms

def _update_bid_forms(limit=None):
    """
    update bid-forms stored at DEFAULT_FORM_PATH
    """
    lineitems = get_lineitems()
    lineitem_ids = sorted(lineitems)

    _refresh_forms()
    logging.info("Found total %s lineitem" % len(lineitems))
    num_form = 0
    for idx, lineitem_id in enumerate(lineitem_ids):
        logging.info("Getting %sth lineitem, id: %s." % (idx, lineitem_id))
        lineitem = lineitems.get(lineitem_id)
        _forms = create_forms(lineitem)
        if _forms:
            num_form = _store_bid_forms(idx, _forms)
            num_form += num_form
        if limit and num_form >= limit:
            break
    return

def _refresh_forms():
    try:
        os.remove(DEFAULT_FORM_PATH)
    except OSError:
        pass

def _store_bid_forms(cur_idx, forms):
    if cur_idx:
        logging.info("Reading and writing bid-forms for %sth campaign" % cur_idx)
        try:
            # this shouldn't happen, just in case we delete the tmp json file
            with open(DEFAULT_FORM_PATH, 'r+') as f:
                orig = ujson.loads(f.read())
                forms += orig
                logging.info("Had %s bid-forms in cached json file" % len(orig))
        except IOError:
            logging.info("No stored bidform json file found")
            pass
    forms = _add_form_id(forms)
    with open(DEFAULT_FORM_PATH, 'w') as f:
        f.write(ujson.dumps(forms))
        logging.info("New json file has %s bid-forms" % len(forms))
    return len(forms)

def _add_form_id(forms):
    for idx, form in enumerate(forms):
        form['id'] = idx
    return forms
