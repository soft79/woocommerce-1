jQuery(function ($) {
	var myparcel_update_timer = false;
	window.myparcel_use_old_address_fields = wc_myparcel_frontend.useOldAddressFields === '1';
	window.myparcel_checkout_updating = false;
	window.myparcel_force_update = false;
	window.myparcel_selected_shipping_method = '';
	window.myparcel_updated_shipping_method = '';

	// reference jQuery for MyParcel iFrame
	window.mypajQuery = $;
	
	// show if we have to
	if ( window.myparcel_initial_hide == false ) {
		$('#myparcel-iframe').show();
	}

	// set iframe object load functions
	var iframe_object = $('#myparcel-iframe')
		.load( function() {
			var $MyPaiFrame = $('#myparcel-iframe')[0];
			window.MyPaWindow = $MyPaiFrame.contentWindow ? $MyPaiFrame.contentWindow : $MyPaiFrame.contentDocument.defaultView;
			MyPaLoaded();
		});
	// load iframe content
	iframe_object.attr( 'src', wc_myparcel_frontend.iframe_url );

	window.MyPaSetHeight = function() {
		setTimeout(function () {
			var iframeheight = MyPaWindow.document.body.scrollHeight;
			$('#myparcel-iframe').height(iframeheight);
		}, 500);

		// $('#myparcel-iframe').height($('#myparcel-iframe').contents().height());
	}

	window.MyPaLoaded = function() {
		window.update_myparcel_settings();
		MyPaWindow.initSettings( window.mypa.settings );
		MyPaSetHeight();
	}

	// set iframe height when delivery options changed
	$( document ).on('change', '#mypa-chosen-delivery-options input', function() {
		MyPaSetHeight(); // may need a trick to prevent height from updating 10x
		window.myparcel_checkout_updating = true;
		$('body').trigger('update_checkout');
	});

	// Auto fill helper for layout with separate number field
	if (window.myparcel_use_old_address_fields) {
		// helper variable to disable splitting street on user input
		var auto_fill = true;

		// Split street to 3 fields on autofill
		$('#billing_street_name, #shipping_street_name').on('input', function () {
			type = $(this).attr('id').search('billing') ? 'shipping' : 'billing';

			if (auto_fill === true) {
				address = this.value.split(/(?:([A-z]+)\s?(\d{1,6})(.+)?)/g)
					.filter(function (value) {
						return value !== ''
					}); // filter out empty values

				$('#' + type + '_street_name').val(address[0]);
				$('#' + type + '_house_number').val(address[1]);
				$('#' + type + '_house_number_suffix').val(address[2]);
			}
		});

		$(['shipping', 'billing']).each(function () {
			$('#' + this + '_street_name,#' + this + '_house_number,#' + this + '_house_number_suffix').on('keypress', function () { // disable splitting when user modifies street field manually
				auto_fill = false;
			});
		});
	}

	// make delivery options update at least once (but don't hammer)
	// myparcel_update_timer = setTimeout( update_myparcel_delivery_options_action, '500' );

	// hide checkout options if not NL
	$( '#billing_country, #shipping_country' ).change(function() {
		window.myparcel_force_update = true; // in case the shipping method doesn't change
		// check_country();
		update_myparcel_settings();
	});

	// multi-step checkout doesn't trigger update_checkout when postcode changed
    if (window.myparcel_use_old_address_fields) {
        $(document).on('change', '.wizard .content #billing_street_name, .wizard .content #billing_house_number, .wizard .content #billing_postcode', function () {
            update_myparcel_settings();
        });
    }

	// hide checkout options for non parcel shipments
	$( document ).on( 'updated_checkout', function() {
		window.myparcel_checkout_updating = false; //done updating

		if ( typeof myparcel_delivery_options_always_display !== 'undefined' && myparcel_delivery_options_always_display == 'yes') {
			show_myparcel_delivery_options();
		} else if ( myparcel_delivery_options_shipping_methods.length > 0 ) {
            // check if shipping is user choice or fixed
			if ( $( '#order_review .shipping_method' ).length > 1 ) {
				var shipping_method = $( '#order_review .shipping_method:checked').val();
			} else {
				var shipping_method = $( '#order_review .shipping_method').val();
			}

			if ( typeof shipping_method === 'undefined' ) {
				// no shipping method selected, hide by default
				hide_myparcel_delivery_options();
				return;
			}

			if (shipping_method.indexOf('table_rate:') !== -1 || shipping_method.indexOf('betrs_shipping:') !== -1) {
				// WC Table Rates
				// use shipping_method = method_id:instance_id:rate_id
				if (shipping_method.indexOf('betrs_shipping:') !== -1) {
					shipping_method = shipping_method.replace(":", "_");
				}
			} else {
				// none table rates
				// strip instance_id if present
				if (shipping_method.indexOf(':') !== -1) {
					shipping_method = shipping_method.substring(0, shipping_method.indexOf(':'));
				}
				var shipping_class = $('#myparcel_highest_shipping_class').val();
				// add class refinement if we have a shipping class
				if (shipping_class) {
					shipping_method_class = shipping_method+':'+shipping_class;
				}
			}

			if ( shipping_class && $.inArray(shipping_method_class, window.myparcel_delivery_options_shipping_methods) > -1 ) {
				window.myparcel_updated_shipping_method = shipping_method_class;
				show_myparcel_delivery_options();
				myparcel_selected_shipping_method = shipping_method_class;
			} else if ( $.inArray(shipping_method, myparcel_delivery_options_shipping_methods) > -1 ) {
				// fallback to bare method if selected in settings
				myparcel_updated_shipping_method = shipping_method;
				show_myparcel_delivery_options();
				myparcel_selected_shipping_method = shipping_method;
			} else {
				shipping_method_now = typeof shipping_method_class !== 'undefined' ? shipping_method_class : shipping_method;
				myparcel_updated_shipping_method = shipping_method_now;
				hide_myparcel_delivery_options();
				myparcel_selected_shipping_method = shipping_method_now;
			}
		} else {
			// not sure if we should already hide by default?
			hide_myparcel_delivery_options();
		}
	});

	// update myparcel settings object with address when shipping or billing address changes
	window.update_myparcel_settings = function() {
		if ( window.myparcel_use_old_address_fields ) {
			if (get_settings() === false) {
				return;
			}

			var billing_postcode = $( '#billing_postcode' ).val();
			var billing_house_number = $( '#billing_house_number' ).val();
			var billing_street_name = $( '#billing_street_name' ).val();

			var shipping_postcode = $( '#shipping_postcode' ).val();
			var shipping_house_number = $( '#shipping_house_number' ).val();
			var shipping_street_name = $( '#shipping_street_name' ).val();

			var use_shipping = $( '#ship-to-different-address-checkbox' ).is(':checked');

			if (!use_shipping && billing_postcode && billing_house_number) {
				window.mypa.settings.postal_code = billing_postcode.replace(/\s+/g, '');
				window.mypa.settings.number = billing_house_number;
				window.mypa.settings.street = billing_street_name;
				update_myparcel_delivery_options()
			} else if (shipping_postcode && shipping_house_number) {
				window.mypa.settings.postal_code = shipping_postcode.replace(/\s+/g, '');;
				window.mypa.settings.number = shipping_house_number;
				window.mypa.settings.street = shipping_street_name;
				update_myparcel_delivery_options()
			}
        }
	};

	// billing or shipping changes
	$('#billing_postcode, #billing_house_number, #shipping_postcode, #shipping_house_number').change(function () {
		update_myparcel_settings();
	}).change();

	// any delivery option selected/changed - update checkout for fees
	$('#mypa-chosen-delivery-options').on('change', 'input', function () {
		window.myparcel_checkout_updating = true;
		// disable signed & recipient only when switching to pickup location
		mypa_postnl_data = JSON.parse($('#mypa-chosen-delivery-options #mypa-input').val());
		if (typeof mypa_postnl_data.location !== 'undefined') {
			$('#mypa-signed, #mypa-recipient-only').prop("checked", false);
		}
		jQuery('body').trigger('update_checkout');
	});

	function get_settings() {
		if (typeof window.mypa !== 'undefined' && typeof window.mypa.settings !== 'undefined') {
			return window.mypa.settings;
		} else {
			return false;
		}
	}

	function check_country() {
		country = get_shipping_country();
		if (country !== 'NL' && country !== 'BE') {
			hide_myparcel_delivery_options();
		}
	}

	function get_shipping_country() {
		if ($('#ship-to-different-address-checkbox').is(':checked')) {
			country = $('#shipping_country').val();
		} else {
			country = $('#billing_country').val();
		}

		return country;
	}

	function hide_myparcel_delivery_options() {
		MyParcel.hideAllDeliveryOptions();
		// clear delivery options
		if (is_updated_shipping_method()) { // prevents infinite updated_checkout - update_checkout loop
			jQuery('body').trigger('update_checkout');
		}
	}

	function show_myparcel_delivery_options() {
		// show only if NL
		check_country();

        if ( is_updated_shipping_method() ) { // prevents infinite updated_checkout - update_checkout loop
            MyParcel.showAllDeliveryOptions();
		}
	}

	function update_myparcel_delivery_options() {
		// Small timeout to prevent multiple requests when several fields update at the same time
		clearTimeout( myparcel_update_timer );
		myparcel_update_timer = setTimeout( update_myparcel_delivery_options_action, '5' );
	}

	function update_myparcel_delivery_options_action() {
		country = get_shipping_country();
		if (window.myparcel_checkout_updating !== true && country === 'NL' && typeof MyPaWindow !== 'undefined' && typeof MyPaWindow.mypa !== 'undefined') {
			MyPaWindow.mypa.settings = window.mypa.settings;
			MyPaWindow.updateMyPa();
		}
	}

	function is_updated_shipping_method() {
		if (window.myparcel_updated_shipping_method !== window.myparcel_selected_shipping_method || window.myparcel_force_update === true) {
			window.myparcel_force_update = false; // only force once
			return true;
		} else {
			return false;
		}
	}
});
