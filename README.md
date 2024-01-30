# HA-Matter-Bridge

[![paypal](https://camo.githubusercontent.com/0283ea90498d8ea623c07906a5e07e9e6c2a5eaa6911d52033687c60cfa8d22f/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f446f6e6174652d50617950616c2d677265656e2e737667)](https://www.paypal.com/donate/?business=VHWQSZR2SS898&no_recurring=0&item_name=HA+Matter+Bridge&currency_code=EUR) [![Publish Docker image](https://github.com/Jatus93/ha-matter-bridge/actions/workflows/docker-image.yml/badge.svg)](https://github.com/Jatus93/ha-matter-bridge/actions/workflows/docker-image.yml)

## Purpose

This project serves as a proof of concept to connect HomeAssistant devices to Voice Assistants through the Matter Protocol.

## Getting Started

### Setup

- Add this repository to your home assistant install \
  [![Open your Home Assistant instance and show the add add-on repository dialog with a specific repository URL pre-filled.](https://my.home-assistant.io/badges/supervisor_add_addon_repository.svg)](https://my.home-assistant.io/redirect/supervisor_add_addon_repository/?repository_url=https%3A%2F%2Fgithub.com%2FJatus93%2Fha-matter-bridge)

- click on check for updates
- click on HA Matter Bridge
- install

### Configuration

1. Start this addon, should autmatically get all your devices
2. Watch the logs for the QR code that is needed to pair it with your assistant
3. Pair it with your assistant with the matter procedure
4. Enjoy

## Key Features

- Supports two types of elements: lights and dimmable lights.

## How to Contribute

1. Help organize the project and dependencies.
2. Add integrations for other devices.
3. Add some tests
4. Donation

## Known Issues and Limitations

- Currently, only lights (including dimmable lights) are working, and the system may be unstable.
