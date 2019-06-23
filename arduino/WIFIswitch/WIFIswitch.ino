/*
   Copyright (c) 2015, Majenko Technologies
   All rights reserved.

   Redistribution and use in source and binary forms, with or without modification,
   are permitted provided that the following conditions are met:

 * * Redistributions of source code must retain the above copyright notice, this
     list of conditions and the following disclaimer.

 * * Redistributions in binary form must reproduce the above copyright notice, this
     list of conditions and the following disclaimer in the documentation and/or
     other materials provided with the distribution.

 * * Neither the name of Majenko Technologies nor the names of its
     contributors may be used to endorse or promote products derived from
     this software without specific prior written permission.

   THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
   ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
   WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
   DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR
   ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
   (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
   LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
   ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
   (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
   SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <ESP8266WebServer.h>
#include <ESP8266mDNS.h>
#include "settings.h"

#define RELAY 0 // relay connected to  GPIO0
#define DELAY_BETWEEN_SWITCH 2000

int switchStatus = 0;

ESP8266WebServer server(80);

const int led = 13;

void handleRoot() {
  digitalWrite(led, 1);
  renderStatus();
  digitalWrite(led, 0);
}

void handleSwitchOn(){
  digitalWrite(led, 1);
  if ( server.arg("token") == TOKEN){
    switchOn();
  }
  renderStatus();
  digitalWrite(led, 0);
  delay(DELAY_BETWEEN_SWITCH);
}

void switchOn() {
  if( switchStatus == 0) {
    digitalWrite(RELAY, LOW);
    switchStatus = 1; 
  }
}

void handleSwitchOff(){
  digitalWrite(led, 1);
  if ( server.arg("token") == TOKEN){
    switchOff();
  }
  renderStatus();
  digitalWrite(led, 0);
  delay(DELAY_BETWEEN_SWITCH);
}

void renderStatus() {
  server.send(200, "application/json", "{\"status\": " + String(switchStatus) + "}");
}

void switchOff() {
  if( switchStatus == 1) {
    digitalWrite(RELAY, HIGH);
    switchStatus = 0; 
  }
}

void setup(void) {
  pinMode(led, OUTPUT);
  digitalWrite(led, 0);

  pinMode(RELAY,OUTPUT);
  switchOff();

  Serial.begin(115200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  Serial.println("");

  // Wait for connection
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.print("Connected to ");
  Serial.println(ssid);
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());

  if (MDNS.begin("esp8266")) {
    Serial.println("MDNS responder started");
  }

  server.on("/", handleRoot);
  server.on("/on", handleSwitchOn);
  server.on("/off", handleSwitchOff);
  server.begin();
  Serial.println("HTTP server started");
}

void loop(void) {
  server.handleClient();
  MDNS.update();
}