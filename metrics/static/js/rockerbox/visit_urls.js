RB.init = (function(){
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

    function updateUids() {
	var chosen_values = $("select#urls").val();
	console.log(chosen_values)

	if (chosen_values != null){
	    var url = chosen_values.join()

	    $.getJSON(addParam("/visit_uids?format=json", "url=" + url), function(data) {
		$("ul#uids").empty();
		$.each(data, function(i, item) {
		    $("ul#uids").append($("<li>" + item.uid + "</li>"));
		});
	    });
	}
	else {
	    $("ul#uids").empty();
	}
    }

    URL = addParam(URL,"format=json")
    
    $(document).ready(function() {
	$(".multi-chosen-select").chosen();

	$("#source").submit(function(e) {
	    e.preventDefault();
	    var source = $("input#source").val();
	    console.log(source);
	    console.log(addParam("/visit_urls?format=json", "source=" + source));

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
	    updateUids();
	});
    })
});