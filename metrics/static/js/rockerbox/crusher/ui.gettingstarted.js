var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.routes.navigation = RB.routes.navigation || {}

RB.crusher.ui.gettingstarted = (function(gettingstarted, crusher) {
	gettingstarted.progress_indicator = function(row, step) {
		/* Progress Indicator */
		progress_indicator = {
			steps: [{
					title: 'Pixel Implementation'
				},
				{
					title: 'Create Action'
				},
				{
					title: 'Finish'
			}]
		}

		// Wrapper
		var progress_indicator_wrap = d3_updateable(row, 'progress-indicator-wrap','section')
			.classed('progress-indicator', true)
			.html('<hr/>');

		// Steps list
		var progress_indicator_steps = d3_updateable(progress_indicator_wrap, 'progress-indicator-steps','ol')
		// Individual steps
		d3_splat(progress_indicator_steps, 'progress-indicator-step', 'li', progress_indicator.steps, function(x, i) {
			return x.title;
		})
			.html(function(x, i) {
				var active_class = '';
				var current_step = i+1;
				if(current_step <= step) {
					active_class = ' active';
				}
				return '<div class="bullet' + active_class + '"></div><span>' + x.title + '</span>';
			})
	}

	gettingstarted.step1 = function(row) {
		gettingstarted.progress_indicator(row, 1);
		
		var step_wrapper = d3_updateable(row, 'step-wrapper', 'section')
			.classed('ct-chart col-md-6 gettingstarted-step', true)

		var step = d3_updateable(step_wrapper, 'onboarding-step', 'div')
			.classed('chart-description pixel-code', true)
			.style('padding-bottom', '15px')
			.text('Paste the following snippet before the closing <head>-tag on every page.')

		// Fetch and display pixels
		crusher.subscribe.add_subscriber(["advertiser"], function(advertiser_data) {
			var pixel_code = {
				all_pages: advertiser_data.segments.filter(function(x){return x.segment_implemented != "" && x.segment_name.indexOf("All") > -1})[0].segment_implemented.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
				conversion: advertiser_data.segments.filter(function(x){return x.segment_implemented != "" && x.segment_name.indexOf("Conversion") > -1})[0].segment_implemented.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
			};

			/*
				All pages pixel
			*/
			var code1 = d3_updateable(step, 'pixel-code-allpages','pre')
				.html('<code>' + pixel_code.all_pages + '</code>')
				.classed('language-markup pixel-code', true);

			var test_iframe = d3_updateable(step, 'pixel-test-iframe','iframe')
				.style('border', 'none')
				.style('height', '1px')
				.style('width', '0px')
				.on('load', function(e) {
					// Checks existence of different pixels
					var pixel_count = {
						allpages: 0,
						conversion: 0
					}

					crusher.subscribe.add_subscriber(["pixel_status"], function(status_data) {
						status_data.forEach(function(pixel) {
							// Check which pixels are active
							if(pixel.segment_name.indexOf("All Pages") >=0 ) {
								pixel_count.allpages++;
							} else if(pixel.segment_name.indexOf("Conversion") >=0 ) {
								pixel_count.conversion++;
							}
						});

						var validated = true;
						if( $(".pixel-code input[type='checkbox']").is(':checked') ) {
							if(!pixel_count.conversion) {
								validated = false;
							}
						}

						if(!pixel_count.allpages) {
							validated = false;
						}

						if(validated) {
							window.location.href = '/crusher/gettingstarted/step2';
							// RB.routes.navigation.forward(controller.states["/crusher/gettingstarted/step2"])
						} else {
							url_check_button.html("Continue to creating action")
							alert('Pixel has not been implemented yet');
						}
					},"gettingstarted",true,false)
				})

			// Input field for URL to check
			var url_check_row = d3_updateable(step, 'url-check-row','div')
				.style('padding', '10px 0')
				.html('<span>Website URL: </span>');
			url_check = d3_updateable(url_check_row, 'url-check','input')
				.classed('url-check', true)
				.attr('type', 'text')
				.attr('value', 'http://')

			var conversion_pixel_optin_row = d3_updateable(step, 'conversion-pixel-optin','div')
				.style('padding', '5px 0')

			var conversion_pixel_optin = d3_updateable(conversion_pixel_optin_row, 'conversion-pixel-optin','input')
				.attr('type', 'checkbox')
				.style('margin-right', '5px')
				.on('click', function() {
					if($(this).is(':checked')) {
						code2_wrapper.style('display', 'block');
					} else {
						code2_wrapper.style('display', 'none');
					}
				});

			d3_updateable(conversion_pixel_optin_row, 'conversion-pixel-optin','span')
				.text('Also set a conversion pixel')


			/*
				Conversion pixel
			*/
			var code2_wrapper = d3_updateable(step, 'pixel-code-conversion','div')
				.style('display', 'none');

			d3_updateable(code2_wrapper, 'pixel-code-conversion','hr')

			var code2_title = d3_updateable(code2_wrapper, 'pixel-code-conversion','p')
				.text('Paste the following snippet before the closing <head>-tag on just the conversion page.')

			var code2 = d3_updateable(code2_wrapper, 'pixel-code-conversion','pre')
				.html('<code>' + pixel_code.conversion + '</code>')
				.classed('language-markup', true)

			var code2_description = d3_updateable(code2_wrapper, 'pixel-code-conversion','p')
				.text('In order to validate the conversion pixel and continue to the next step, you have to place an order.')

			setTimeout(function() {
				Prism.highlightAll()

				var url_check_button_wrapper = d3_updateable(step,".about-check","div")

				var url_check_button = d3_updateable(url_check_button_wrapper,".about-check","a")
					.classed("btn btn-default btn-sm", true)
					.style("margin-right", "30px")
					.style("margin-top", "10px")
					.html("Continue to creating action")
					.on("click",function(x) {
						url_check_button.html("Validating...");

						test_iframe.attr('src', $('.url-check').val());
					});
			}, 0);
		}, 'pixel-code-fetching', true, true);

	}

	gettingstarted.step2 = function(row) {
		gettingstarted.progress_indicator(row, 2);

		var step_wrapper = d3_updateable(row, 'step-wrapper', 'section')
			.classed('ct-chart col-md-6 gettingstarted-step', true)

		var step = d3_updateable(step_wrapper, 'onboarding-step', 'div')
			.classed('chart-description pixel-code', true)
			.style('padding-bottom', '15px')
			.text('Create your first action')

		var input = d3_updateable(step, 'onboarding-step', 'input')
			.classed('bloodhound typeahead form-control tt-input first-action', true)
			.attr('value', 'all pages')
			.style('position', 'relative')
			.style('vertical-align', 'top')
			.style('background-color', 'transparent')

		d3_updateable(step,"create-action-button","a")
			.classed('btn btn-default btn-sm',true)
			.style('margin-right', '30px')
			.style('margin-top', '10px')
			.text('Continue')
			.on('click',function(x) {
				var first_action = $('input.first-action').val();

				var data = {
					'action_id': undefined,
					'action_name': first_action,
					'action_string': first_action,
					'domains': undefined,
					'name': first_action,
					'operator': 'or',
					'param_list': [],
					'rows': [{
						'url_pattern': first_action,
						'values': undefined
					}],
					'url_pattern': [
						first_action
					],
					'urls': undefined,
					'values': undefined,
					'visits_data': []
				}
				RB.crusher.controller.action.save(data, false);

				window.location.href = '/crusher/gettingstarted/step3';
				// RB.routes.navigation.forward(controller.states["/crusher/gettingstarted/step3"])
			},'gettingstarted',true,false)
	}

	gettingstarted.step3 = function(row) {
		gettingstarted.progress_indicator(row, 3);

		var final_actions = [
			{
				icon: 'signal',
				title: 'Create Action'
			},
			{
				icon: 'filter',
				title: 'Create Funnel'
			}
		];

		var step_wrapper = d3_updateable(row, 'step-wrapper', 'section')
			.classed('ct-chart col-md-6 gettingstarted-step', true)

		var step = d3_updateable(step_wrapper, 'onboarding-step', 'div')
			.classed('chart-description pixel-code', true)
			.style('padding-bottom', '15px')

		d3_updateable(step, ".onboarding-step", "")
			.classed("chart-title", true)
			.style("padding-bottom", "15px")
			.html("Congratulations, you're ready to use RockerBox!")

		d3_splat(step, '.final-steps', 'div', final_actions, function(x, i) {
			return x.title;
		})
			.style('display', 'inline-block')
			.style('width', '50%')
			.style('text-align', 'center')
			.style('cursor', 'pointer')
			.html(function(x) {
				return '<span class="icon glyphicon glyphicon-' + x.icon + '" style="font-size: 32px;"></span>' +
					'<span style="display: block; margin-top: 10px;">' + x.title + '</span>';
			})
			.on('click', function() {
				var i = $(this).closest('div').index();
				switch(i) {
					case 1:
						// RB.routes.navigation.forward(controller.states["/crusher/action/new"])
						window.location.href = '/crusher/action/new';
						break;
					case 2:
						// RB.routes.navigation.forward(controller.states["/crusher/funnel/new"])
						window.location.href = '/crusher/funnel/new';
						break;
				}
			});
		
	}
	
	return gettingstarted;

})(RB.crusher.ui.gettingstarted || {}, RB.crusher );