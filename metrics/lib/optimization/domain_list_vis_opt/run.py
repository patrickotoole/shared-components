import sys
sys.path.append("../../bidder/")
sys.path.append("../opt_script/")
sys.path.append("../../")
import buffering_smtp_handler
import logging
import domain_list_push


from options import define, options, parse_command_line, options_to_dict
import helpers



logger = logging.getLogger("opt")

if __name__ == "__main__":
    import logsetup
    logsetup.configure_log(subject="domain_list_vis_opt")
    configs = helpers.get_configs("domain_list_vis_opt")


    datatypes = {
        "domain_list_id": int,
        "metric": str,
        "threshold": float,
    }


    for config_name, params in configs.iteritems():

        # Convert params to correct datatypes
        for param in params:
            if param in datatypes:
                params[param] = datatypes[param](params[param])

        logger.info("Starting domain list push with %s" %config_name)

        domain_list_id = params['domain_list_id']
        metric = params['metric']
        threshold = params['threshold']

        D = domain_list_push.DomainVisPush(domain_list_id, metric, threshold)
        D.load_data()
        D.filter()
        D.push()

        logger.info("domain list push finished SUCCESSFULLY with %s" %config_name)


