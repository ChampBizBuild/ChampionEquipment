-- Champion Equipment (sole trader) is not GST-registered
update business_settings
set gst_registered = false,
    updated_at = now();
