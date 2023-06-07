<a name="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]

## About The Project

See my write-up on [IoT with Mongoose OS](https://tailucas.github.io/update/2023/06/07/iot-with-mongoose-os.html). Here you can find a brief write-up about my projects based on Mongoose OS and my general experience with this IoT platform.

This is a [Mongoose OS][mongoose-url] project containing a [configuration template][app-config-url] and [code][app-script-url] written in the so-called minimal JavaScript or [mJS](https://github.com/cesanta/mjs).

### How it works

This project makes use of the [ESP32][esp-url] GPIO interrupt mode to act as a basic counter. When using the [LDR Sensor Module][instructables-url], the photo-diode can be placed on the LED indicator of a prepaid electricity meter to tally metered kWh units fairly precisely. The model is useful because it allows the photo-diode sensitivity to be appropriate for the LED on the device. In some early testing, I got an appreciation for how quickly the interrupt handling is when I was incorrectly counting the 50Hz ripple in the LED brightness and it was necessary to filter it out. As an added level of resilience, I would also "debounce" the input according to the maximum theoretical current draw of the household through the meter.

### Basic operation

At startup, the counter can start in one of two modes. The default mode is GPIO-interrupt where the interrupts are responsible for incrementing the counter and a separate timer is responsible for doing the accounting on the register value. The other mode uses a polling approach and the analog-to-digital converter (ADC). I left both implementations in the code because it is useful, tested boilerplate for other projects.

Depending on whether the counter is set to incrementing or decrementing, the counted values update a `register_reading` as part of a few other useful fields in an MQTT publish message. The meter also subscribes to a topic `meter/electricity/control/#` to enable remote resetting of the register. A tempting addition is to automatically read the real register value using some kind of non-invasive image recognition but that is outside the scope of this project.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

Technologies that help make this project useful:

[![Espressif][esp-shield]][esp-url]
[![Mongoose OS][mongoose-shield]][mongoose-url]
[![MQTT][mqtt-shield]][mqtt-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

Here is some detail about the intended use of this project.

## Prerequisites

Your development environment needs to have the `mos` [tool][mos-tool-url] available to build firmware binaries and for first-time configuration of the device. Mongoose OS has a good [getting started guide][mos-install-url] with installation instructions.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->
## Usage

The Mongoose OS [documentation](https://mongoose-os.com/docs/mongoose-os/userguide/build.md) provides a detailed but concise instruction on how to use the `mos` tool to build the binaries that can then either be flashed directly to a USB-connected IoT device or that can be uploaded to the [mDash][mdash-url] site and delivered as an [OTA update](https://mongoose-os.com/docs/mongoose-os/userguide/ota.md).

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->
## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [Template on which this README is based](https://github.com/othneildrew/Best-README-Template)
* [All the Shields](https://github.com/progfay/shields-with-icon)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/tailucas/meter-app.svg?style=for-the-badge
[contributors-url]: https://github.com/tailucas/meter-app/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/tailucas/meter-app.svg?style=for-the-badge
[forks-url]: https://github.com/tailucas/meter-app/network/members
[stars-shield]: https://img.shields.io/github/stars/tailucas/meter-app.svg?style=for-the-badge
[stars-url]: https://github.com/tailucas/meter-app/stargazers
[issues-shield]: https://img.shields.io/github/issues/tailucas/meter-app.svg?style=for-the-badge
[issues-url]: https://github.com/tailucas/meter-app/issues
[license-shield]: https://img.shields.io/github/license/tailucas/meter-app.svg?style=for-the-badge
[license-url]: https://github.com/tailucas/meter-app/blob/main/LICENSE

[app-script-url]: https://github.com/tailucas/meter-app/blob/master/fs/init.js
[app-config-url]: https://github.com/tailucas/meter-app/blob/master/mos.yml

[esp-url]: https://www.espressif.com/
[esp-shield]: https://img.shields.io/static/v1?style=for-the-badge&message=Espressif&color=E7352C&logo=Espressif&logoColor=FFFFFF&label=
[instructables-url]: https://www.instructables.com/LDR-Sensor-Module-Users-Manual-V10/
[mdash-url]: https://mdash.net/home/
[mongoose-url]: https://mongoose-os.com/
[mongoose-shield]: https://img.shields.io/static/v1?style=for-the-badge&message=Mongoose&color=880000&logo=Mongoose&logoColor=FFFFFF&label=
[mos-tool-url]: https://mongoose-os.com/docs/mongoose-os/userguide/mos-tool.md
[mos-install-url]: https://mongoose-os.com/docs/mongoose-os/quickstart/setup.md
[mqtt-url]: https://mqtt.org/
[mqtt-shield]: https://img.shields.io/static/v1?style=for-the-badge&message=MQTT&color=660066&logo=MQTT&logoColor=FFFFFF&label=
