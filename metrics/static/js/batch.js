$(document).ready( function() {
    $("select[name=request_type]").change(function() {
	if (this.value == "domain_list") {
	    $("label[for=target_window], input[name=target_window]")
		.prop("disabled", false)
		.prop("hidden", false);
	    $("label[for=segment], select[name=segment]")
		.prop("disabled", false)
		.prop("hidden", false);
	}

	else {
	    $("label[for=target_window], input[name=target_window]")
		.prop("disabled", true)
		.prop("hidden", true);
	    $("label[for=segment], select[name=segment]")
		.prop("disabled", true)
		.prop("hidden", true);
	}

	if (this.value == "hive_query") {
	    $("label[for=hive_query], textarea[name=hive_query]")
		.prop("disabled", false)
		.prop("hidden", false);
	    $("label[for=custom_params], input[name=custom_params]")
		.prop("disabled", false)
		.prop("hidden", false);

	}

	else {
	    $("label[for=hive_query], textarea[name=hive_query]")
		.prop("disabled", true)
		.prop("hidden", true);
	    $("label[for=custom_params], input[name=custom_params]")
		.prop("disabled", true)
		.prop("hidden", true);
	}

    }).change();

    $("#custom_params").on("click", function() {
	if ($("input[name=custom_params]").is(":checked")) {
	    $("input[name=expiration]").prop("disabled", true);
	    $("input[name=target_segment]").prop("disabled", true);
	    $("#default_hive_instructions").hide();
	    $("#custom_hive_instructions").show();
	}
	else {
	    $("input[name=expiration]").prop("disabled", false);
	    $("input[name=target_segment]").prop("disabled", false);
	    $("#custom_hive_instructions").hide();
	    $("#default_hive_instructions").show();
	}
    }).triggerHandler("click");;

    $("#segment").prepend("<option value='' selected='selected'></option>");

    $("#request_form").validate({
	rules: {
	    segment: {
		required: true
	    },

	    expiration: {
		required: true,
		number: true
	    },

	    request_type: {
		required: true
	    },
	    
	    segment: {
		required: true
	    },
	    
	    target_window: {
		required: true,
		number: true
	    },

	    target_segment: {
		required: true
	    },

	    hive_query: {
		required: true
	    },

	    active: {
		required: true
	    },

	    comment: {
		required: true
	    },

	    owner: {
		required: true,
		email: true
	    }
	}
    });
});

