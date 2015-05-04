# Placement Optimization

The purpose of this project is provide an automated system of removing bad placements from campaigns. Bad placements are those that are either unprofitable or have click-fraud.

This project has three main components:

- `datasource.py`, which grabs and reshapes the relevant data from Appnexus reporting API
- `analysis.py`, which applies optimization rule group filtering on the data
- `action.py`, which pushes optimization actions to Appnexus

## Running the optimization

The entire optimization can be run by calling the `run.py` script. The necessary inputs for running are:

`start_date`,`end_date`, `external_advertiser_id`, `campaigns`, `RPA`, `RPA_multipliers`,`loss_limits`, `imps_served_cutoff`,`CTR_cutoff`

 The inputs are called from the command line in the following fashion:

`python run.py --start_date="2015-01-01"  --external_adv_id=225133 --advertiser=bigstock --script_name=bigstock_placement_opt --RPA=70 --RPA_multipliers=1,2,10 --loss_limits=70,140,700 --imps_served_cutoff=2000 --CTR_cutoff=0.005 --served_ratio_cutoff=0.8 --loaded_ratio_cutoff=0.4`