var RB = RB || {}
RB.crusher = RB.crusher || {}
RB.crusher.ui = RB.crusher.ui || {}
RB.routes.navigation = RB.routes.navigation || {}

RB.crusher.ui.gettingstarted = (function(gettingstarted, crusher) {
	gettingstarted.progress_indicator = function(row, step) {
		/* Progress Indicator */
		progress_indicator = {
			steps: [{
					title: '1. Pixel Implementation'
				},
				{
					title: '2. Create Segment'
				},
				{
					title: '3. Finish'
			}]
		}

		// Wrapper
		var progress_indicator_wrap = d3_updateable(row, '.progress-indicator-wrap','section')
			.classed('progress-indicator-wrap progress-indicator', true)
			.attr('data-step', step)
			.html('<hr/><hr/>');

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

	gettingstarted.validatePixel = function() {
		crusher.subscribe.add_subscriber(["pixel_status"], function(status_data) {
			// Checks existence of different pixels
			var pixel_count = {
				allpages: 0,
				conversion: 0
			}

			status_data.forEach(function(pixel) {
				// Check which pixels are active
				if(pixel.segment_name.indexOf("All Pages") >=0 ) {
					pixel_count.allpages++;
				} else if(pixel.segment_name.indexOf("Conversion") >=0 ) {
					pixel_count.conversion++;
				}
			});

			var validated = true;
			if(!pixel_count.allpages) {
				validated = false;
			}

			return validated;
		},"gettingstarted",true,false)
	}

	gettingstarted.step1 = function(row, actions) {
		gettingstarted.progress_indicator(row, 1);

		var step_wrapper = d3_updateable(row, '.step-wrapper', 'section')
			.classed('ct-chart col-md-9 gettingstarted-step step-wrapper', true)

		var step = d3_updateable(step_wrapper, '.onboarding-step', 'div')
			.classed('chart-description pixel-code onboarding-step', true)
			.style('padding-bottom', '15px')
			.html('<h3>Installation instructions</h3><p>Paste the following snippet before the closing &lt;head&gt; tag on every page.</p><p>Ensure that the pixel above is firing on ​<strong>all</strong>​ pages on your site. This includes conversion pages.</p>')

		// Fetch and display pixels
		crusher.subscribe.add_subscriber(["advertiser", "an_uid"], function(advertiser_data, uid) {
			/*
				Check if pixel is already setup and if we can continue to step 2
			*/
			var all_pages_segment = advertiser_data.segments.filter(function(x){return x.segment_implemented != "" && x.segment_name.indexOf('All Pages') > -1})[0];
			all_pages_segment.uuid = uid;	// 2512143178804115692
			crusher.subscribe.add_subscriber(["segment_pixel_status"], function(segment_pixel_status_data) {
				/*
					If length is 0, error: Pixel not set up at all
					If length is not 0, but refferer not same as sld, error: Pixel is implemented, but on the wrong site
				*/

				var valid = true;

				// Check if pixel is set at all
				if(segment_pixel_status_data.length == 0) {
					valid = false;
					var toast_message = "We couldn't find the pixel on your website " + advertiser_data.client_sld + ". Please make sure you have placed it before the closing &lt;head&gt; tag on every page and try again.";
				} else {
					// Pixel is set, but check if any hits are coming from the right domain
					var correct_domain_found = 0;
					segment_pixel_status_data.forEach(function(item){
						if(JSON.parse(item.json_body).referrer.indexOf(advertiser_data.client_sld) > -1) {
							correct_domain_found++;
						}
					});

					if(!correct_domain_found) {
						valid = false;

						var toast_message = "Pixel has been setup, but it's on the wrong page. Please make sure you have placed it on http://" + advertiser_data.client_sld + " and try again.";
					}
				}

				if(valid) {
					$.toast({
						heading: 'Success',
						text: 'Pixel has been succesfully setup!',
						position: 'top-right',
						icon: 'success',
						stack: 1
					});
					actions.continue();
				} else {
					$.toast({
						heading: 'Setup your pixel',
						text: 'Pixel has not been setup yet. Please setup your pixel and click on the verification button.',
						position: 'top-right',
						stack: 1
					});
				}
			},"specific_pixel",true,false,all_pages_segment)


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

			var conversion_pixel_optin_row = d3_updateable(step, '.conversion-pixel-optin-wrapper','div')
				.classed('conversion-pixel-optin-wrapper', true)
				.style('padding', '5px 0')

			// Remove conversion pixel stuff for now
			// if(pixel_code.conversion === null) {
				conversion_pixel_optin_row.style('display', 'none');
			// }

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

				var url_check_button_info = d3_updateable(url_check_button_wrapper,".url-check-button-info","p")
					.classed("url-check-button-info", true)
					.style("margin", "5px 0 10px 0")
					.text("After clicking on the verification button, your website will open in a popup to simulate a page view. This way we can see if the pixel is setup correctly on your website and if it's firing.")

				var url_check_button = d3_updateable(url_check_button_wrapper,".url-check-button","a")
					.classed("btn btn-default btn-sm url-check-button", true)
					.style("margin-right", "30px")
					.html("Verifiy Pixel Has Been Placed")
					.on("click",function(x) {
						var validation_popup = window.open('http://' + advertiser_data.client_sld, "validation_popup", "status=1, width=50, height=50,right=50,bottom=50,titlebar=no,toolbar=no,menubar=no,location=no,directories=no,status=no");

						setTimeout(function() {
							url_check_button.html("Validating...");

							var all_pages_segment = advertiser_data.segments.filter(function(x){return x.segment_implemented != "" && x.segment_name.indexOf('All Pages') > -1})[0];
							all_pages_segment.uuid = uid;	// 2512143178804115692
							crusher.subscribe.add_subscriber(["segment_pixel_status"], function(segment_pixel_status_data) {
								validation_popup.close();
								/*
									If length is 0, error: Pixel not set up at all
									If length is not 0, but refferer not same as sld, error: Pixel is implemented, but on the wrong site
								*/

								var valid = true;

								// Check if pixel is set at all
								if(segment_pixel_status_data.length == 0) {
									valid = false;
									var toast_message = "We couldn't find the pixel on your website " + advertiser_data.client_sld + ". Please make sure you have placed it before the closing &lt;head&gt; tag on every page and try again.";
								} else {
									// Pixel is set, but check if any hits are coming from the right domain
									var correct_domain_found = 0;
									segment_pixel_status_data.forEach(function(item){
										if(JSON.parse(item.json_body).referrer.indexOf(advertiser_data.client_sld) > -1) {
											correct_domain_found++;
										}
									});

									if(!correct_domain_found) {
										valid = false;

										var toast_message = "Pixel has been setup, but it's on the wrong page. Please make sure you have placed it on http://" + advertiser_data.client_sld + " and try again.";
									}
								}

								if(valid) {
									actions.continue();
								} else {
									$.toast({
										heading: 'Something went wrong',
										text: toast_message,
										position: 'top-right',
										icon: 'error',
										hideAfter: false,
										stack: 1
									});
								}

								validation_popup.close();
							},"specific_pixel",true,false,all_pages_segment)
						}, 3000);
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

		var step_header = d3_updateable(step, '.step-header', 'h3')
			.classed('step-header', true)
			.text('Create your first segment')

		var step_details = d3_updateable(step, '.onboarding-step-details', 'div')
			.classed('chart-description pixel-code onboarding-step-details', true)
			.style('padding-bottom', '10px')
			.text('A segment is a collection of pages with a given keyword in the URL. The first segment we are creating here is the All Pages segment, which contains every single page.')

		crusher.subscribe.add_subscriber(["advertiser"], function(advertiser_data) {
			var input = d3_updateable(step, '.first-action', 'input')
				.classed('bloodhound typeahead form-control tt-input first-action', true)
				.attr('value', 'http://' + advertiser_data.client_sld)
				.attr('disabled', '')
				.style('position', 'relative')
				.style('vertical-align', 'top')
				.style('background-color', 'transparent')

			d3_updateable(step,".create-action-button","a")
				.classed('btn btn-default btn-sm create-action-button',true)
				.style('margin-right', '30px')
				.style('margin-top', '10px')
				.text('Continue')
				.on('click',function(x) {
					var first_action = 'all pages'

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
		}, 'pixel-code-fetching', true, true);
	}

	gettingstarted.step3 = function(row, actions) {
		gettingstarted.progress_indicator(row, 3);

		var final_actions = [
			{
				icon: 'signal',
				title: 'View Segments'
			},
			// {
			// 	icon: 'filter',
			// 	title: 'Create Funnel'
			// }
		];

		var step_wrapper = d3_updateable(row, '.step-wrapper', 'section')
			.classed('ct-chart col-md-9 gettingstarted-step step-wrapper', true)

		var step = d3_updateable(step_wrapper, '.onboarding-step', 'div')
			.classed('chart-description pixel-code onboarding-step', true)
			.style('padding-bottom', '15px')

		d3_updateable(step, ".chart-title", "p")
			.classed("chart-title", true)
			.style("padding-bottom", "15px")
			.html("Great job, you're ready to use Crusher!")

		d3_splat(step, '.final-steps', 'div', final_actions, function(x, i) {
			return x.title;
		})
			.style('display', 'inline-block')
			.style('width', '100%')
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
