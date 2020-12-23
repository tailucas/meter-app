load('api_config.js');
load('api_adc.js');
load('api_gpio.js');
load('api_mqtt.js');
load('api_sys.js');
load('api_timer.js');
load('api_pwm.js');

let debug = false;
let interrupt_mode = true;
let incrementing_meter = false;

let mqtt_topic = 'meter/electricity/'+Cfg.get('device.id');

let now = Timer.now();
let last_minute_metered = 0;
let last_metered_minute = now;
let last_posted = now;
let pulse_count = 0;
let sample_value = 0;
let register_reading = -1;

let pubMsg = function() {
  let message = JSON.stringify({
    uptime: Sys.uptime(),
    last_sample_value: sample_value,
    last_minute_metered: last_minute_metered,
    last_metered_minute: last_metered_minute,
    register_reading: register_reading
  });
  let ok = MQTT.pub(mqtt_topic, message, 1);
  if (debug) {
    if (!ok) {
      print('ERROR', mqtt_topic, '<-', message);
    } else {
      print(mqtt_topic, '<-', message);
    }
  }
};

let meterAccounting = function(analog_timer) {
  now = Timer.now();
  // accounting
  if (!analog_timer || now - last_posted >= 60) {
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

MQTT.sub(mqtt_topic + '/#', function(conn, topic, msg) {
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
  }
  pubMsg();
}, null);

let digital_value = 1;
let adc_pin = 34;
let sample_latch = false;
// 60Ah @ 230V => 13800Wh => max pulse rate is 3.8pps => 261ms or 5 samples per second
let sample_rate = 200;
if (debug) {
  sample_rate = 1000;
}
if (interrupt_mode) {
  let digital_pin = 35;
  GPIO.set_mode(digital_pin, GPIO.MODE_INPUT);
  GPIO.set_pull(digital_pin, GPIO.PULL_UP);
  GPIO.set_int_handler(digital_pin, GPIO.INT_EDGE_NEG, function(pin) {
    // GPIO pull-up and edge not always honoured
    digital_value = GPIO.read(pin);
    if (digital_value === 0) {
      ++pulse_count;
      if (debug) {
        print('Pin', pin, 'got interrupt');
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
