load('api_config.js');
load('api_adc.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_sys.js');
load('api_timer.js');

let debug = Cfg.get('app.debug');
if (debug) {
  print('DEBUG MODE ENABLED');
}
let interrupt_mode = Cfg.get('app.interrupt_mode');
let incrementing_meter = Cfg.get('app.incrementing_meter');
let device_id = Cfg.get('device.id');
let mqtt_topic_prefix = Cfg.get('app.mqtt_topic');
let mqtt_pub_topic = mqtt_topic_prefix+'/'+Cfg.get('app.mqtt_pub_topic');
let mqtt_sub_topic = mqtt_topic_prefix+'/'+Cfg.get('app.mqtt_sub_topic');
let mqtt_heartbeat_topic = mqtt_topic_prefix+'/heartbeat/'+device_id;
let input_location = Cfg.get('app.input_location');
print('Physical device location=', input_location);

let now = Timer.now();
let last_minute_metered = 0;
let last_metered_minute = now;
let last_posted = now;
let pulse_count = 0;
let sample_value = 0;
let register_reading = -1;

let sendMsg = function(topic, message) {
  let ok = MQTT.pub(topic, message, 1);
  if (debug) {
    if (!ok) {
      print('ERROR', topic, '<-', message);
    } else {
      print(topic, '<-', message);
    }
  }
};

let pubMsg = function() {
  now = Timer.now();
  let message = JSON.stringify({
    uptime: Sys.uptime(),
    timestamp: now,
    device_id: device_id,
    input_location: input_location,
    last_sample_value: sample_value,
    last_minute_metered: last_minute_metered,
    last_metered_minute: last_metered_minute,
    register_reading: register_reading
  });
  sendMsg(mqtt_pub_topic, message);
  // send heartbeat for uptime check
  sendMsg(mqtt_heartbeat_topic, 'OK');
};

let meterAccounting = function(analog_timer) {
  now = Timer.now();
  // accounting
  if (!analog_timer || now - last_posted >= 60) {
    if (debug) {
      print('Performing accounting', now, 'since', last_posted, '; count:', pulse_count);
    }
    // update these together
    last_metered_minute = now;
    last_minute_metered = pulse_count;
    if (register_reading > 0) {
      if (incrementing_meter) {
        register_reading += pulse_count;
      } else {
        register_reading -= pulse_count;
      }
      // clamp to zero
      if (register_reading < 0) {
        register_reading = 0;
      }
    }
    // reset the minute counter
    pulse_count = 0;
    // post this
    pubMsg();
    last_posted = now;
  }
};

MQTT.sub(mqtt_sub_topic, function(conn, topic, msg) {
  if (debug) {
    print(topic, '->', msg);
  }
  let obj = JSON.parse(msg);
  // reset the register reading to the user-specified value
  if (typeof obj.set_register === "number") {
    register_reading = obj.set_register;
    if (debug) {
      print('Set register to', register_reading);
    }
    if (register_reading <= 0) {
      register_reading = -1;
    }
    pubMsg();
  } else if (typeof obj.adjust_register === "number") {
    if (register_reading <= 0) {
      register_reading = 0;
    }
    register_reading += obj.adjust_register;
    if (register_reading <= 0) {
      register_reading = 0;
    }
    if (debug) {
      print('Adjusted register by', obj.adjust_register, 'to', register_reading);
    }
    pubMsg();
  }
}, null);

let digital_value = 1;
let adc_pin = Cfg.get('app.input_pin.analog');
let sample_latch = false;
// 60Ah @ 230V => 13800Wh => max pulse rate is 3.8pps => 261ms or ~6 samples per second
// 40Ah @ 230V => 9200Wh => max pulse rate is 2.5pps => 391ms or ~5 samples per second
let sample_rate = 200;
if (debug) {
  sample_rate = 1000;
}
let last_pulse_diff_ms = 0;
let last_pulse = Timer.now();
if (interrupt_mode) {
  let digital_pin = Cfg.get('app.input_pin.digital');
  GPIO.set_mode(digital_pin, GPIO.MODE_INPUT);
  // use debouncing button handler with 1ms delay
  GPIO.set_button_handler(digital_pin, GPIO.PULL_UP, GPIO.INT_EDGE_NEG, 1, function(pin) {
    // GPIO pull-up and edge not always honoured
    digital_value = GPIO.read(pin);
    if (digital_value === 0) {
      if (debug) {
        print('Pin', pin, 'got interrupt; count:', pulse_count);
      }
      last_pulse_diff_ms = (Timer.now()*1000)-(last_pulse*1000);
      if (last_pulse_diff_ms >= 270) {
        ++pulse_count;
        last_pulse = Timer.now();
      }
      else {
        if (debug) {
          print('Discarding early pulse', last_pulse_diff_ms, 'ms');
        }
      }
    }
  }, null);
  // install the timer that performs the accounting
  Timer.set(60 * 1000, true /* repeat */, function() {
    meterAccounting(false);
  }, null);
  // after interrupt handler installed
  GPIO.enable_int(digital_pin);
} else {
  // 60Ah @ 230V => 13800Wh => max pulse rate is 3.8pps => 261ms
  ADC.enable(adc_pin);
  Timer.set(sample_rate, true /* repeat */, function() {
    // "low" is 4096, "high" is 0
    sample_value = ADC.read(adc_pin);
    if (debug) {
        print('Pin', adc_pin, 'sampled', sample_value);
    }
    if (sample_value < 1500) {
      if (!sample_latch) {
        ++pulse_count;
        // and latch
        sample_latch = true;
      }
    } else {
      // unlatch
      sample_latch = false;
    }
    meterAccounting(true);
  }, null);
}
