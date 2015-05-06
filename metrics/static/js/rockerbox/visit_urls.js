RB.init = (function(){
    var uids = [];
    var domains = [];
    var URL = window.location.pathname + window.location.search

    var addParam = function(u,p) {
	return u.indexOf("?") >= 0 ? u + "&" + p : u + "?" + p
    }

    function compare(a,b) {
	if (a.visits < b.visits)
	    return 1;
	if (a.visits > b.visits)
	    return -1;
	return 0;
    }

    function updateData(callback) {
	updateUids( function() {
	    updateDomains(function () {
		if (callback) callback();
	    });
	});
    }

    function updateUids(callback) {
	var chosen_values = $("select#urls").val();

	if (chosen_values != null){
	    var urlParam = chosen_values.join()
	    uids = []
	    $.getJSON(addParam("/visit_uids?format=json", "url=" + urlParam), function(data) {
		$.each(data, function(i, item){
		    uids.push(item.uid);
		});
		if (callback) callback();
	    });
	}
	else {
	    uids = []
	    if (callback) callback();
	}
    }

    function updateDomains(callback) {
	if (uids != null && uids.length > 0){
	    domains = []
	    console.log({"uids": uids})
	    $.post("/visit_domains?format=json&kind=domains", JSON.stringify({"uids": uids}), function(data) {
		$.each(data, function(i, item){
		    domains.push({"domain": item.domain, "visits": item.uid});
		});
		domains.sort(compare)
		if (callback) callback();
	    }, 'json');
	}
	else {
	    domains = []
	    if (callback) callback();
	}
    }

    function updateUidsUI() {
	$("ul#uids").empty();
	$.each(uids, function(i, item) {
	    $("ul#uids").append($("<li>" + item + "</li>"));
	});
    }

    function updateDomainsUI() {
	$("ul#domains").empty();
	$.each(domains, function(i, item) {
	    $("ul#domains").append($("<li>" + item.domain + "(" + item.visits  + ")</li>"));
	});
    }

    URL = addParam(URL,"format=json")
    
    $(document).ready(function() {
	$(".multi-chosen-select").chosen();

	$("#source").submit(function(e) {
	    e.preventDefault();
	    var source = $("input#source").val();

	    $.getJSON(addParam("/visit_urls?format=json", "source=" + source), function(data) {
		data.sort(compare);
		$('select#urls').empty().trigger("chosen:updated");
		$.each(data, function(i, item) {
		    $("select#urls")
			.append($("<option></option>")
				.attr("value", item.url)
				.text(item.url + "(" + item.visits + ")"));
		});
		$('select#urls').trigger("chosen:updated");
	    });
	});
	
	$("select#urls").chosen().change( function() {
	    updateData(function() {
		// updateUidsUI();
		updateDomainsUI();
	    });
	});
    })
});