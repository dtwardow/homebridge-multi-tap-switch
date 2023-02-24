<p align="center">
<img src="https://github.com/homebridge/branding/raw/master/logos/homebridge-wordmark-logo-vertical.png" width="150" alt="Homebridge">
</p>

# Homebridge Multi-Tap-Switch

This plugin provides a switch, which can be triggered multiple times to trigger different actions.

Actions could be everything, which can be configured within **Automations**.

## How it works?

The plugin provides a virtual **switch** which can be triggered manually (which doesn't really make sense) or
by **Automations**. A configurable set of **programmable** switches will than be used to
trigger scenes and/or devices (like for i.e. motion or contact sensors).

Each time the switch is triggered ```ON``` - what can be done multiple times without reset - the **stateless** switches
are triggered one after the other.
The switch is reset after a configurable timeout to start from the first **programmable** switch again. 

## Installation

Either install this plugin through [Homebridge Config UI X](https://github.com/oznu/homebridge-config-ui-x)
or manually by following these instructions:

1. Install Homebridge (follow [the instructions](https://github.com/homebridge/homebridge/wiki)).
2. Install this plugin by running `npm install -g homebridge-multitap-switch`.
3. Add this plugin to the Homebridge `config.json` (as described in the next section)

## Configuration

The configuration allows the user to add multiple **Multi-Tap-Switches**. The following parameters are available:

| Option                             | Default Value  | Characteristic (runtime configuration) | Description                                                                               |
|------------------------------------|----------------|----------------------------------------|-------------------------------------------------------------------------------------------|
| `name`                             | MultiTapSwitch |                                        | Name of the Platform Accessory (primarily shown in logs)                                  |
| `devices[]`                        |                |                                        | Array of configured devices                                                               |
| `devices[].name`                   |                |                                        | Name of the switch                                                                        |
| `devices[].numberConfiguredScenes` | 5              | `Configured Scenes`                    | Number of **stateless** switches (cannot be changed during runtime)                       |
| `devices[].triggerTimeout`         | 10             | `Trigger Timeout`                      | Seconds, after which the switch is reset (starting from the first **programmable** switch |
| `devices[].resetAfterSwitchOff`    | false          |                                        | Reset the switch (like after timeout), when it is turned ```OFF```.                       |
| `devices[].logging`                | false          |                                        | Logging of switch/trigger actions.                                                        |

The parameter ```triggerTimeout``` can be changed in the configuration during runtime. So, this is just the initial value.<br>
> **NOTE:** If the value is out of sync from the configured value (i.e. updated via Home-App), it will not be updated on later configuration changes.
> It must be set back to the configured value first! 

The parameter ```numberConfiguredScenes``` just defines how many **programmable** switches are available. The number of
really **used** switches can configured during runtime, between 0 and the configured number.

> **NOTE:** Additional parameters (also called **Characteristics**) can only be configured via 3rd-party HomeKit apps (i.e.
> Home+, Controller for HomeKit, etc.), but in the basic Home App!

So, an example **platform** plugin config will look as follows:

````
    {
      "platform": "MultiTapSwitch",
      "name": "MTSwitch",
      "devices": [
        {
          "name": "MTSwitch 1",
          "numberConfiguredScenes": 5,
          "triggerTimeout": 10,
          "resetAfterSwitchOff": true,
          "logging": true
        }
      ]
    }
````
