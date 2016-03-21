# -*- test-case-name: twisted.test.test_defer,twisted.test.test_defgen,twisted.internet.test.test_inlinecb -*-
# Copyright (c) Twisted Matrix Laboratories.
# See LICENSE for details.

"""
Support for results that aren't immediately available.

Maintainer: Glyph Lefkowitz

@var _NO_RESULT: The result used to represent the fact that there is no
    result. B{Never ever ever use this as an actual result for a Deferred}.  You
    have been warned.

@var _CONTINUE: A marker left in L{Deferred.callbacks} to indicate a Deferred
    chain.  Always accompanied by a Deferred instance in the args tuple pointing
    at the Deferred which is chained to the Deferred which has this marker.
"""

from __future__ import division, absolute_import

import traceback
import types
import warnings
from sys import exc_info
from functools import wraps

# Twisted imports
from twisted.python.compat import cmp, comparable
from twisted.python import lockfile, failure
from twisted.logger import Logger
from twisted.python.deprecate import warnAboutFunction, deprecated
from twisted.python.versions import Version
from twisted.internet.defer import *
import twisted
from twisted.internet.defer import _DefGen_Return
log = Logger()

def get_content(self, data):
    def default(self, data):
        df = Convert.df_to_json(data)
        self.write(df)
        self.finish()
    if type(data) == type(Exception()):
        self.set_status(404)
        self.write(ujson.dumps({"error":str(data)}))
        self.finish()
    else:
        yield default, (data,)



def _inlineCallbacksErrors(result, g, deferred, self):
    """
    See L{inlineCallbacks}.
    """
    # This function is complicated by the need to prevent unbounded recursion
    # arising from repeatedly yielding immediately ready deferreds.  This while
    # loop and the waiting variable solve that by manually unfolding the
    # recursion.

    waiting = [True, # waiting for result?
               None] # result

    while 1:
        try:
            # Send the last result back as the result of the yield expression.
            isFailure = isinstance(result, failure.Failure)
            if isFailure:
                #import ipdb; ipdb.set_trace()
                #import ipdb; ipdb.set_trace()
                #bound = get_content.__get__(self, self.__class__)
                #bound(Exception(str(result)))
                #result = result.throwExceptionIntoGenerator(g)
                self.get_content(Exception(str(result)))
                #result = result
                #raise StopIteration
                result = result.throwExceptionIntoGenerator(g)
            else:
                result = g.send(result)
        except StopIteration as e:
            # fell off the end, or "return" statement
            deferred.callback(getattr(e, "value", None))
            return deferred
        except _DefGen_Return as e:
            # returnValue() was called; time to give a result to the original
            # Deferred.  First though, let's try to identify the potentially
            # confusing situation which results when returnValue() is
            # accidentally invoked from a different function, one that wasn't
            # decorated with @inlineCallbacks.

            # The traceback starts in this frame (the one for
            # _inlineCallbacks); the next one down should be the application
            # code.
            appCodeTrace = exc_info()[2].tb_next
            if isFailure:
                # If we invoked this generator frame by throwing an exception
                # into it, then throwExceptionIntoGenerator will consume an
                # additional stack frame itself, so we need to skip that too.
                appCodeTrace = appCodeTrace.tb_next
            # Now that we've identified the frame being exited by the
            # exception, let's figure out if returnValue was called from it
            # directly.  returnValue itself consumes a stack frame, so the
            # application code will have a tb_next, but it will *not* have a
            # second tb_next.
            if appCodeTrace.tb_next.tb_next:
                # If returnValue was invoked non-local to the frame which it is
                # exiting, identify the frame that ultimately invoked
                # returnValue so that we can warn the user, as this behavior is
                # confusing.
                ultimateTrace = appCodeTrace
                while ultimateTrace.tb_next.tb_next:
                    ultimateTrace = ultimateTrace.tb_next
                filename = ultimateTrace.tb_frame.f_code.co_filename
                lineno = ultimateTrace.tb_lineno
                warnings.warn_explicit(
                    "returnValue() in %r causing %r to exit: "
                    "returnValue should only be invoked by functions decorated "
                    "with inlineCallbacks" % (
                        ultimateTrace.tb_frame.f_code.co_name,
                        appCodeTrace.tb_frame.f_code.co_name),
                    DeprecationWarning, filename, lineno)
            deferred.callback(e.value)
            return deferred
        except:
            deferred.errback()
            return deferred
        
        if isinstance(result, Deferred):
            # a deferred was yielded, get the result.
            def gotResult(r):
                if waiting[0]:
                    waiting[0] = False
                    waiting[1] = r
                else:
                    _inlineCallbacksErrors(r, g, deferred, self)

            result.addBoth(gotResult)
            if waiting[0]:
                # Haven't called back yet, set flag so that we get reinvoked
                # and return from the loop
                waiting[0] = False
                return deferred

            result = waiting[1]
            # Reset waiting to initial values for next loop.  gotResult uses
            # waiting, but this isn't a problem because gotResult is only
            # executed once, and if it hasn't been executed yet, the return
            # branch above would have been taken.


            waiting[0] = True
            waiting[1] = None


    return deferred



def inlineCallbacksErrors(f):
    """
    inlineCallbacks helps you write L{Deferred}-using code that looks like a
    regular sequential function. For example::

        @inlineCallbacks
        def thingummy():
            thing = yield makeSomeRequestResultingInDeferred()
            print(thing)  # the result! hoorj!

    When you call anything that results in a L{Deferred}, you can simply yield it;
    your generator will automatically be resumed when the Deferred's result is
    available. The generator will be sent the result of the L{Deferred} with the
    'send' method on generators, or if the result was a failure, 'throw'.

    Things that are not L{Deferred}s may also be yielded, and your generator
    will be resumed with the same object sent back. This means C{yield}
    performs an operation roughly equivalent to L{maybeDeferred}.

    Your inlineCallbacks-enabled generator will return a L{Deferred} object, which
    will result in the return value of the generator (or will fail with a
    failure object if your generator raises an unhandled exception). Note that
    you can't use C{return result} to return a value; use C{returnValue(result)}
    instead. Falling off the end of the generator, or simply using C{return}
    will cause the L{Deferred} to have a result of C{None}.

    Be aware that L{returnValue} will not accept a L{Deferred} as a parameter.
    If you believe the thing you'd like to return could be a L{Deferred}, do
    this::

        result = yield result
        returnValue(result)

    The L{Deferred} returned from your deferred generator may errback if your
    generator raised an exception::

        @inlineCallbacks
        def thingummy():
            thing = yield makeSomeRequestResultingInDeferred()
            if thing == 'I love Twisted':
                # will become the result of the Deferred
                returnValue('TWISTED IS GREAT!')
            else:
                # will trigger an errback
                raise Exception('DESTROY ALL LIFE')

    If you are using Python 3.3 or later, it is possible to use the C{return}
    statement instead of L{returnValue}::

        @inlineCallbacks
        def loadData(url):
            response = yield makeRequest(url)
            return json.loads(response)
    """
    def innerErr(e):
        def raiseRandomError(e):
            raise e
        return raiseRandomError
    @wraps(f)
    def unwindGenerator(*args, **kwargs):
        import twisted
        try:
            gen = f(*args, **kwargs)
        except _DefGen_Return:
            raise TypeError(
                "inlineCallbacks requires %r to produce a generator; instead"
                "caught returnValue being used in a non-generator" % (f,))
        if not isinstance(gen, types.GeneratorType):
            raise TypeError(
                "inlineCallbacks requires %r to produce a generator; "
                "instead got %r" % (f, gen))
        rrr = _inlineCallbacksErrors(None, gen, Deferred(), args[0])
        has_error = False
        try:
            has_error = isinstance(rrr.result, twisted.python.failure.Failure)
        except:
            has_error = False
        if has_error:
            args[0].get_content(Exception(rrr.result))
            raise StopIteration
        return rrr
    return unwindGenerator


