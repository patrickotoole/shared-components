function addParam(u, p) {
    return u.indexOf("?") >= 0 ? u + "&" + p : u + "?" + p
}

function makeRow(data){
    var $row = $("<tr></tr>")
    var rowId = data.id

    $.each(cols, function(i, k) {
	if ($.inArray(k, editable) != -1) {
	    $row.append("<td><a href='#' data-pk=" +  rowId + " class=" + k + ">" + data[k] + "</a></td>");
	}
	else {
	    $row.append("<td>" + data[k] + "</td>");
	}
    });
    return $row
}

function makeHeader(cols) {
    var $header = $("<tr></tr>")
    $.each(cols, function(i, col){
	$header.append("<th>" + col + "</th>")
    })
    return $header
}

function populateTable(cols, editable, query) {
    var URL = window.location.pathname + window.location.search
    URL = addParam(URL, "format=json")

    $(".row").append("<h3>" + query + "</h3>")

    $("#data-table").append(makeHeader(cols))

    $.getJSON(URL, function(data){
	if (data.length === 0) {
	    $("#data-table").append("<tr><td>Sorry, no results available.</td></tr>");
	}
	else {
	    $.each(data, function(i, result) {
		$("#data-table").append(makeRow(result))
	    });
	    $.each(editable, function(i, key) {
		$('a.'+key).editable({
                    type: 'text',
                    name: key,
                    url: window.location.pathname,
                    title: 'Enter a value for '+key
		});
	    });
	}
    });
}
