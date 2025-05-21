# Cartesia TTS Connector

## What this Connector application does

This Connector application allows [Voice](https://www.vonage.com/communications-apis/voice/) or [Video](https://www.vonage.com/communications-apis/video/) calls to use Cartesia TTS engine.

Vonage API platform supports different **voice channels** for getting TTS from Cartesia TTS engine, including:
- Public Switched Telephone Network (**PSTN**), e.g. cell phones, landline phones, VoIP phones/applications connecting via PSTN,
- Session Initiation Protocol (**SIP**), e.g. SIP trunking, SIP from Contact Center, [SIP Interconnect](https://tokbox.com/developer/guides/sip) from Vonage Video API clients,
- Vonage **Voice WebRTC clients** (Web, iOS, Android),
- Vonage **Video WebRTC clients** (Web, iOS, Android),
- **WebSocket** connections, e.g. from Contact Centers, augmenting existing Voice applications.

## How this Connector application works

Speech synthesis received from Cartesia are sent to the User through the same WebSocket leg and the original voice channel leg.</br>

See https://github.com/nexmo-se/agent-drop-off-tts-to-customer-vm for a **sample Voice API application** using this Connector code to stream TTS audio from Cartesia TTS engine to established voice or video calls.

## Prerequisites

### Get your API key from Cartesia

// text to be added here

## Deployment

You may choose to deploy locally on your computer for testing, then or directly, to a cloud hosted environment as explained as follows.

### Local deployment on your computer

#### Node.js

[Download and install Node.js](https://nodejs.org/en/download/package-manager).

This application has been tested with Node.js version 18.19.

#### Ngrok

For a `local deployment`, you may use ngrok (an _agent endpoint_ service) for both this Connector application and the sample [Voice API application](https://github.com/nexmo-se/voice-to-ai-engines) with [multiple ngrok agent endpoints](https://ngrok.com/docs/traffic-policy/getting-started/agent-endpoints/config-file/).

To do that, [download and install ngrok](https://ngrok.com/downloads).</br>
Sign in or sign up with [ngrok](https://ngrok.com/), follow the [Quickstart](https://ngrok.com/docs/getting-started/) guide.

Set up two domains, one to forward to the local port 6000 (as this Connector application will be listening on port 6000), the other one to the local port 8000 for the sample [Voice API application](https://github.com/nexmo-se/voice-to-ai-engines).


Run ngrok to start both _agent endpoints_ that forward to local ports 6000 and 8000,</br>
please take note of the ngrok **Enpoint URL** that forwards to local port 6000 as it will be needed when setting the [Voice API application](https://github.com/nexmo-se/voice-app-websockets),
that URL looks like:</br>
`xxxxxxxx.ngrok.io`</br>
(that value will be the argument of **`PROCESSOR_SERVER`** in the .env file of the sample [Voice API application](https://github.com/nexmo-se/voice-to-ai-engines)),</br>
no `port` is necessary with ngrok as public hostname,</br>
that host name to specify must not have leading protocol text such as `https://`, `wss://`, nor trailing `/`.

#### Remaining setup and application launch

Copy the `.env.example` file over to a new file called `.env`:
```bash
cp .env.example .env
```
Update the parameter argument in .env file as per previous sections contents:<br>
**`CARTESIA_API_KEY`**<br>


Install necessary node modules with the command:<br>
 ```bash
npm install
```

Launch this Connector application:<br>
```bash
node cartesia-tts-connector.cjs
```
Default local (not public!) of this Connector application's listening `port` is: 6000.

Make sure ngrok is running as per previous section.

#### Next steps - Voice API Application

**Either** follow instructions in the [**sample Voice API Application**](https://github.com/nexmo-se/agent-drop-off-tts-to-customer-vm) repository for the next steps,

**or** instead update and use **your existing Voice API application** to connect voice calls via [WebSockets](https://developer.vonage.com/en/voice/voice-api/concepts/websockets) to this Connector Application.

### Hosted deployment on Vonage Cloud Runtime

You may deploy this Connector application on Vonage's serverless infrastructure [Vonage Cloud Runtime](https://developer.vonage.com/en/vonage-cloud-runtime/overview) (VCR).

WIP - Instructions will be added here. Sorry for the delay.






