# Optimization Scripts

This project has three main components:
- `opt_script`, which contains the abstract base classes (ABCs) for the optimization scripts. This essentially makes up the framework under which all optimization scripts will run.
- `opt_ex`, which is an example of what an optimization script may look like. It uses the framework to pull viewability data and identify poor placements
- `tests`, which contains tests for both the framework code and all optimization scripts

### Making a new script

To make a new optimization script, simply navigate to this directory (`/rockerbox-metrics/metrics/lib/optimization/`) and create a new directory. This directory will contain your code. Also, create a directory in `tests/` to hold your unit tests.
