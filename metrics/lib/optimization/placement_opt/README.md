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

`python run.py --start_date="2015-04-01" --end_date="2015-04-10" --external_adv_id=225133 --campaigns=6865740 --RPA=70 --RPA_multipliers=1,2,3 --loss_limits=0,2,3 --imps_served_cutoff=40000 --CTR_cutoff=0.05`