$(document).ready( function() {
    $("select[name=request_type]").change(function() {
	if (this.value == "domain_list") {
	    $("label[for=segment], select[name=segment]")
		.prop("disabled", false)
		.prop("hidden", false);
	    $("#hive_instructions, #custom_hive_instructions, #default_hive_instructions").hide();
	}

	else {
	    $("label[for=segment], select[name=segment]")
		.prop("disabled", true)
		.prop("hidden", true);
	    $("#hive_instructions, #default_hive_instructions").show();
	}

	if (this.value == "hive_query") {
	    $("label[for=hive_query], textarea[name=hive_query]")
		.prop("disabled", false)
		.prop("hidden", false);
	    $("label[for=custom_params], input[name=custom_params]")
		.prop("disabled", false)
		.prop("hidden", false);
	    $("#hive_instructions, #default_hive_instructions").show();
	}

	else {
	    $("label[for=hive_query], textarea[name=hive_query]")
		.prop("disabled", true)
		.prop("hidden", true);
	    $("label[for=custom_params], input[name=custom_params]")
		.prop("disabled", true)
		.prop("hidden", true);
	    $("#hive_instructions, #custom_hive_instructions, #default_hive_instructions").hide();
	}

    }).triggerHandler("change");

    $("#custom_params").on("click", function() {
	if ($("input[name=custom_params]").is(":checked")) {
	    $("input[name=expiration]").prop("disabled", true);
	    $("input[name=target_segment]").prop("disabled", true);
	    $("#default_hive_instructions").hide();
	    $("#hive_instructions").show();
	    $("#custom_hive_instructions").show();
	}
	else {
	    $("input[name=expiration]").prop("disabled", false);
	    $("input[name=target_segment]").prop("disabled", false);
	    $("#custom_hive_instructions").hide();
	    $("#hive_instructions").show();
	    $("#default_hive_instructions").show();
	}
    });
    
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

