var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.routes.navigation = RB.routes.navigation || {}

RB.crusher.ui.gettingstarted = (function(gettingstarted, crusher) {
	gettingstarted.progress_indicator = function(row, step) {
		/* Progress Indicator */
		progress_indicator = {
			steps: [{
					title: '1) Pixel Implementation'
				},
				{
					title: '2) Create Action'
				},
				{
					title: '3) Finish'
			}]
		}

		// Wrapper
		var progress_indicator_wrap = d3_updateable(row, '.progress-indicator-wrap','section')
			.classed('progress-indicator-wrap progress-indicator', true)
			.html('<hr/>');

		// Steps list
		var progress_indicator_steps = d3_updateable(progress_indicator_wrap, '.progress-indicator-steps','ol')
			.classed('progress-indicator-steps', true);
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

	gettingstarted.getPixelCode = function(advertiser_data, type) {
		switch(type) {
			case 'allpages':
				var filter_string = 'All';
				break;
			case 'conversion':
				var filter_string = 'Conversion';
				break;
		}
		try {
			return advertiser_data.segments.filter(function(x){return x.segment_implemented != "" && x.segment_name.indexOf(filter_string) > -1})[0].segment_implemented.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
		} catch(e) {
			return null;
		}
	}

	gettingstarted.step1 = function(row, actions) {
		gettingstarted.progress_indicator(row, 1);
		
		var step_wrapper = d3_updateable(row, '.step-wrapper', 'section')
			.classed('ct-chart col-md-9 gettingstarted-step step-wrapper', true)

		var step = d3_updateable(step_wrapper, '.onboarding-step', 'div')
			.classed('chart-description pixel-code onboarding-step', true)
			.style('padding-bottom', '15px')
			.html('<h3>Installation instructions</h3><p>Paste the following snippet before the closing <head> tag on every page.</p><p>Ensure that the pixel above is firing on ​<strong>all</strong>​ pages on your site. This includes conversion pages.</p>')

		// Fetch and display pixels
		crusher.subscribe.add_subscriber(["advertiser"], function(advertiser_data) {
			var pixel_code = {
				all_pages: gettingstarted.getPixelCode(advertiser_data, 'allpages'),
				conversion: gettingstarted.getPixelCode(advertiser_data, 'conversion')
			};

			/*
				All pages pixel
			*/
			var code1 = d3_updateable(step, '.pixel-code-allpages','pre')
				.html('<code>' + pixel_code.all_pages + '</code>')
				.classed('language-markup pixel-code pixel-code-allpages', true);

			var test_iframe = d3_updateable(step, '.pixel-test-iframe','iframe')
				.classed('pixel-test-iframe', true)
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
							actions.continue();
						} else {
							url_check_button.html("Verifiy Pixel Has Been Placed")
							alert('Pixel has not been implemented yet');
						}
					},"gettingstarted",true,false)
				})

			// Input field for URL to check
			var url_check_row = d3_updateable(step, '.url-check-row','div')
				.classed('url-check-row', true)
				.style('padding', '10px 0')
				.html('<span>Website URL: </span>');
			url_check = d3_updateable(url_check_row, '.url-check','input')
				.classed('url-check', true)
				.attr('type', 'text')
				.attr('value', 'http://')

			var conversion_pixel_optin_row = d3_updateable(step, '.conversion-pixel-optin-wrapper','div')
				.classed('conversion-pixel-optin-wrapper', true)
				.style('padding', '5px 0')

			if(pixel_code.conversion === null) {
				conversion_pixel_optin_row.style('display', 'none');
			}

			var conversion_pixel_optin = d3_updateable(conversion_pixel_optin_row, '.conversion-pixel-optin','input')
				.classed('conversion-pixel-optin', true)
				.attr('type', 'checkbox')
				.style('margin-right', '5px')
				.on('click', function() {
					if($(this).is(':checked')) {
						code2_wrapper.style('display', 'block');
					} else {
						code2_wrapper.style('display', 'none');
					}
				});

			d3_updateable(conversion_pixel_optin_row, '.conversion-pixel-optin-description','span')
				.classed('conversion-pixel-optin-description', true)
				.text('Also set a conversion pixel')


			/*
				Conversion pixel
			*/
			var code2_wrapper = d3_updateable(step, '.pixel-code-conversion','div')
				.classed('pixel-code-conversion', true)
				.style('display', 'none');

			d3_updateable(code2_wrapper, '.pixel-code-conversion-hr','hr')
				.classed('pixel-code-conversion-hr', true)

			var code2_title = d3_updateable(code2_wrapper, '.conversion-pixel-title','p')
				.classed('conversion-pixel-title', true)
				.text('Paste the following snippet before the closing <head> tag on just the conversion page.')

			var code2 = d3_updateable(code2_wrapper, '.conversion-pixel','pre')
				.html('<code>' + pixel_code.conversion + '</code>')
				.classed('language-markup conversion-pixel', true)

			var code2_description = d3_updateable(code2_wrapper, '.conversion-pixel-description','p')
				.classed('conversion-pixel-description', true)
				.text('In order to validate the conversion pixel and continue to the next step, you have to place an order.')

			setTimeout(function() {
				Prism.highlightAll()

				var url_check_button_wrapper = d3_updateable(step,".url-check-button-wrapper","div")
					.classed('url-check-button-wrapper', true)

				var url_check_button = d3_updateable(url_check_button_wrapper,".url-check-button","a")
					.classed("btn btn-default btn-sm url-check-button", true)
					.style("margin-right", "30px")
					.style("margin-top", "10px")
					.html("Verifiy Pixel Has Been Placed")
					.on("click",function(x) {
						url_check_button.html("Validating...");

						test_iframe.attr('src', $('.url-check').val());
					});
			}, 0);
		}, 'pixel-code-fetching', true, true);

	}

	gettingstarted.step2 = function(row, actions) {
		gettingstarted.progress_indicator(row, 2);

		var step_wrapper = d3_updateable(row, '.step-wrapper', 'section')
			.classed('ct-chart col-md-9 gettingstarted-step step-wrapper', true)

		var step = d3_updateable(step_wrapper, '.onboarding-step', 'div')
			.classed('chart-description pixel-code onboarding-step', true)
			.style('padding-bottom', '15px')
			.text('Create your first action')

		var input = d3_updateable(step, '.first-action', 'input')
			.classed('bloodhound typeahead form-control tt-input first-action', true)
			.attr('value', 'all pages')
			.style('position', 'relative')
			.style('vertical-align', 'top')
			.style('background-color', 'transparent')

		d3_updateable(step,".create-action-button","a")
			.classed('btn btn-default btn-sm create-action-button',true)
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

				actions.continue();
			},'gettingstarted',true,false)
	}

	gettingstarted.step3 = function(row, actions) {
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

		var step_wrapper = d3_updateable(row, '.step-wrapper', 'section')
			.classed('ct-chart col-md-9 gettingstarted-step step-wrapper', true)

		var step = d3_updateable(step_wrapper, '.onboarding-step', 'div')
			.classed('chart-description pixel-code onboarding-step', true)
			.style('padding-bottom', '15px')

		d3_updateable(step, ".chart-title", "p")
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
			.classed('final-steps', true)
			.on('click', function() {
				var i = $(this).closest('div').index();
				switch(i) {
					case 1:
						actions.goToAction();
						break;
					case 2:
						actions.goToFunnel();
						break;
				}
			});
		
	}
	
	return gettingstarted;

})(RB.crusher.ui.gettingstarted || {}, RB.crusher );