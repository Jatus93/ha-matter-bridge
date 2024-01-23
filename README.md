# HA-Matter-Bridge

## Purpose

This project serves as a proof of concept to connect HomeAssistant devices to Voice Assistants through the Matter Protocol.

## Getting Started

### Prerequisites

-   Docker installed
-   Docker Compose installed
-   Clone this repository

### Configuration

Inside the repository, create a `.env` file with the following variables set:

-   `HA_HOST`: HomeAssistant network address
-   `HA_PORT`: HomeAssistant port
-   `HA_ACCESS_TOKEN`: HomeAssistant access token

Once the `.env` file is configured, run the project with `docker-compose up` for the initial setup. You'll need to scan the QR code in the terminal.

## Key Features

-   Supports two types of elements: lights and dimmable lights.

## How to Contribute

1. Help organize the project and dependencies.
2. Add integrations for other devices.

## Known Issues and Limitations

-   Currently, only lights (including dimmable lights) are working, and the system may be unstable.
