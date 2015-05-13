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

function makeInsertForm(cols, insertable) {
    var $row = $('<tr></tr>')
    console.log(insertable)
    $.each(cols, function(i, col){
	if ($.inArray(col, insertable) != -1) {
	    $row.append('<td><input id="' + col + '" type="text" name="' + col + '" placeholder="' + col + '"></td>')
	}
	else {
	    $row.append("<td></td>")
	}
    });

    var $submitRow = $('<tr></tr>')
    var $submitCell = $('<td colspan="'+ cols.length +'"></td>')
    $submitCell.append($('<button class="btn btn-primary center-block" type="submit">Submit</button>'))
    $submitRow.append($submitCell)
    return $row.add($submitRow)
}

function populateTable(cols, editable, insertable, query) {
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
	$("#data-table").append(makeInsertForm(cols, insertable));
    });

}
