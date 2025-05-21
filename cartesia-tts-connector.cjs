'use strict'

//-------------

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser')
const webSocket = require('ws');
const app = express();
require('express-ws')(app);

app.use(bodyParser.json());

const fsp = require('fs').promises;
const moment = require('moment');

// const axios = require('axios');

//---- CORS policy - Update this section as needed ----

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "OPTIONS,GET,POST,PUT,DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
  next();
});

//--- Record all audio ? --

let recordAllAudio = false;
if (process.env.RECORD_ALL_AUDIO == "true") { recordAllAudio = true };

//--- Streaming timer - Audio packets to Vonage ---

const timer = 19; // in ms, actual timer duration is higher

//---- Cartesia TTS engine ----

const cartesiaApiKey = process.env.CARTESIA_API_KEY;
const { CartesiaClient } = require("@cartesia/cartesia-js");;

//--- Streaming timer calculation ---

let prevTime = Date.now();
let counter = 0;
let total = 0;
let cycles = 2000;

console.log('\n>>> Wait around', Math.round(cycles * timer / 1000), 'seconds to see the actual streaming timer average ...\n');

const streamTimer = setInterval ( () => {
    
    const timeNow = Date.now();
    const difference = timeNow - prevTime;
    total = total + difference;
    prevTime = timeNow;

    counter++;

    if (counter == cycles) { 
        clearInterval(streamTimer);
        console.log('\n>>> Average streaming timer (should be close to 20 AND under 20.000):', total / counter);
    };

}, timer);


//--- Websocket server (for WebSockets from Vonage Voice API platform) ---

app.ws('/socket', async (ws, req) => {

  //-- debug only --
  // let ttsSeq = 0;

  //-----

  const peerUuid = req.query.peer_uuid;

  console.log('>>> WebSocket from Vonage platform')
  console.log('>>> peer call uuid:', peerUuid);

  //------

  let ttsText = null;

  if (req.query.tts_text) {

    ttsText = req.query.tts_text.replace(/_/g, ' ')

  }

  //------

  let wsVgOpen = true; // WebSocket to Vonage ready for binary audio payload?

  let closeVgWs = false;  // when TTS playback is finished, close the Vonage WebSocket
  let closingVgWs = false;  // action to close the Vonage WebSocket has been initiated

  //-- audio recording files -- 
  // const audioToDgFileName = './recordings/' + peerUuid + '_rec_to_dg_' + moment(Date.now()).format('YYYY_MM_DD_HH_mm_ss_SSS') + '.raw'; // using local time
  const audioToVgFileName = './recordings/' + peerUuid + '_rec_to_vg_' + moment(Date.now()).format('YYYY_MM_DD_HH_mm_ss_SSS') + '.raw'; // using local time

  if (recordAllAudio) { 

    try {
      await fsp.writeFile(audioToVgFileName, '');
    } catch(e) {
      console.log("Error creating file", audioToVgFileName, e);
    }
    console.log('File created:', audioToVgFileName);

  }

//-- stream audio to VG --

  let payloadToVg = Buffer.alloc(0);
  let streamToVgIndex = 0;
  let lastTime = Date.now();
  let nowTime;

  //-

  const streamTimer = setInterval ( () => {

    if (payloadToVg.length != 0) {

      const streamToVgPacket = Buffer.from(payloadToVg).subarray(streamToVgIndex, streamToVgIndex + 640);  // 640-byte packet for linear16 / 16 kHz
      streamToVgIndex = streamToVgIndex + 640;

      if (streamToVgPacket.length != 0) {
        if (wsVgOpen && streamToVgPacket.length == 640) {
            nowTime = Date.now();
            
            // console.log('>> interval:', nowTime - lastTime, 's');
            process.stdout.write(".");
            
            ws.send(streamToVgPacket);
            lastTime = nowTime;

            if (recordAllAudio) {
              try {
                fsp.appendFile(audioToVgFileName, streamToVgPacket, 'binary');
              } catch(error) {
                console.log("error writing to file", audioToVg2FileName, error);
              }
            }  

        };
      } else {
        streamToVgIndex = streamToVgIndex - 640; // prevent index from increasing for ever as it is beyond buffer current length
        
        if (closeVgWs) {  // close Vonage WebSocket b/c one-shot TTS has finished playing
          
          if (!closingVgWs) {
            
            closingVgWs = true;
             
            setTimeout( () => {
              ws.close();  // close this WebSocket with Vonage
            }, 4000);               

            console.log("\n>>> End of TTS playback, closing WebSocket to Vonage");
          }

        }


      }

    } 

  }, timer);

  //-- Cartersia TTS connection --

  const cartesia = new CartesiaClient({
    apiKey: cartesiaApiKey
  });

  // Initializing Cartesia WebSocket
  const cartesiaWs = cartesia.tts.websocket({
    container: "raw",
    encoding: "pcm_s16le",
    sampleRate: 16000,
  });

  try {
      await cartesiaWs.connect();
  } catch (error) {
      console.error(`Failed to connect to Cartesia via WebSocket: ${error}`);
      throw error;
  }

  // Create a stream.
  const cartesiaResponse = await cartesiaWs.send({
      modelId: "sonic-2",
      voice: {
          mode: "id",
          id: "a0e99841-438c-4a64-b679-ae501e7d6091",
      },
      transcript: ttsText || "Hello, how are you today?",
  });

  cartesiaResponse.on("message", (msg) => {

    // console.log("tts seq:", ttsSeq);
    // ttsSeq++;

    // console.log("Received Cartesia message:", msg);

    const payload = JSON.parse(msg.toString());

    // console.log('\npayload.type:', payload.type);

    if (payload.data && payload.data != "") {
      const newAudioPayloadToVg = Buffer.from(payload.data, 'base64');

      if (wsVgOpen) {
        payloadToVg = Buffer.concat([payloadToVg, newAudioPayloadToVg]);
      }

    };

    //-- this is to manage one-time shot TTS --
    if (payload.done) { //-- received all audio payloads for this TTS
      
      closeVgWs = true;   //-- terminate websocket when last TTS payload has been played

    }


  });

  //---------------

  ws.on('message', async (msg) => {
    
    if (typeof msg === "string") {
      console.log(">>> Vonage Websocket message:", msg);
    }
    // else {
    //   //-- Ignore possible audio payload from Vonage platform for this use case
    // }
  });

  //--

  ws.on('close', async () => {

    wsVgOpen = false;
    console.log("\n>>> Vonage WebSocket closed");

    // close ws to Cartesia

  });

});

//--- If this application is hosted on VCR (Vonage Cloud Runtime) serverless infrastructure --------

app.get('/_/health', async(req, res) => {

  res.status(200).send('Ok');

});

//=========================================

const port = process.env.VCR_PORT || process.env.PORT || 6000;

app.listen(port, () => console.log(`Connector application listening on port ${port}`));

//------------

