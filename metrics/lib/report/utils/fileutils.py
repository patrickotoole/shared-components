import os
import re

def _filter_by_start(lines, start):
    """
    @param lines: list
    @param start: datetime
    """
    DATE_TIME_REGEX = '(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})'
    to_return = []
    for line in lines:
        match = re.search(DATE_TIME_REGEX, line)
        if not match:
            continue
        dt_str = match.group(1)
        if dt_str < str(start):
            continue
        to_return.append(line)
    return to_return

def tail(path, num_lines=1,
        _buffer=4098,
        start=None,
        ):
    """
    Emulate unix tail

    @param path: str, file path
    @param start: datetime|None, if set, return lines after start time
    @return: str
    """
    f = open(path, 'r')
    # place holder for the lines found
    lines_found = []

    # block counter will be multiplied by buffer
    # to get the block size from the end
    block_counter = -1


    # loop until we find X lines
    while len(lines_found) < num_lines:
        try:
            f.seek(block_counter * _buffer, os.SEEK_END)
        except IOError:  # either file is too small, or too many lines requested
            f.seek(0)
            lines_found = f.readlines()
            break

        lines_found = f.readlines()

        # we found enough lines, get out
        if len(lines_found) > num_lines:
            break

        # decrement the block counter to get the
        # next X bytes
        block_counter -= 1
    if start:
        lines_found = _filter_by_start(lines_found, start)

    return lines_found[-num_lines:]
