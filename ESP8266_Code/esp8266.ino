

//#define BLYNK_DEBUG // Optional, this enables lots of prints
//#define BLYNK_PRINT Serial    // Comment this out to disable prints and save space


#include <ESP8266WiFi.h> 
#include <BlynkSimpleEsp8266.h> 
#include <TimeLib.h>
#include <WidgetRTC.h> //am I still using this?
#include <WiFiUdp.h>

#define D0 16
#define D1 5
#define D2 4
#define D3 0
#define D4 2
#define D5 14
#define D6 12
#define D7 13
#define D8 15
#define D9 3
#define D10 1
#define D11 10
#define D12 9
#define AN A0

//https://github.com/PaulStoffregen/Time/blob/master/examples/TimeNTP_ESP8266WiFi/TimeNTP_ESP8266WiFi.ino
// NTP Servers:
static const char ntpServerName[] = "us.pool.ntp.org";
//static const char ntpServerName[] = "time.nist.gov";
//static const char ntpServerName[] = "time-a.timefreq.bldrdoc.gov";
//static const char ntpServerName[] = "time-b.timefreq.bldrdoc.gov";
//static const char ntpServerName[] = "time-c.timefreq.bldrdoc.gov";

const int timeZone = -8;     // Central European Time
//const int timeZone = -5;  // Eastern Standard Time (USA)
//const int timeZone = -4;  // Eastern Daylight Time (USA)
//const int timeZone = -8;  // Pacific Standard Time (USA)
//const int timeZone = -7;  // Pacific Daylight Time (USA)

WiFiUDP Udp;
unsigned int localPort = 8888;  // local port to listen for UDP packets
time_t getNtpTime();
void digitalClockDisplay();
void printDigits(int digits);
void sendNTPpacket(IPAddress &address);

// You should get Auth Token in the Blynk App.
// Go to the Project Settings (nut icon). 

char auth[] = AUTHCODE; // device on xxxxx.com

char SSID[] = SSID; 
char pass[] = PASSWORD; 

//global variables
float currentInches = 0; //ones used for triggering
float theInches = 0; //upadted everytime getInches is checked
float theRaw = 0; //updated everytime getInches is checked
float startPump = 10;
float stopPump = 4;
int totalPumps;
boolean pumpState; //a boolean = true or false
float reading;

// Attach virtual serial terminal to Virtual Pin V1
WidgetTerminal terminal(V1);
BlynkTimer timer; //this runs calculations outside of the blynk app
WidgetLED led(V2); //for the pump on/off indicator
//WidgetRTC rtc; //real time clock
//to send to the server/logger thing: Blynk.virtualWrite(V20, webData);
//this is the main monitor to tell the pump to turn on or off.
//it will only be called when the water level changes by a certain amount
//or/also, call this every 5 seconds....just to check...
void checkToChange(){
  if(pumpState == false && (currentInches > startPump)){
    digitalWrite(D0, HIGH); //turns on the pump
    Blynk.virtualWrite(V10,currentInches);
    totalPumps++;           //iterates total pumps (as of 1400 18 December 2017, total pumps not yet tracked)
    led.on();               //turns on the litle LED indicator in the app
    /*
    terminal.print("pump On at "); terminal.print(currentInches); terminal.print(" inches. ");
    String pumpTime = String(year()) + month() + day() + "_" + hour() + ":" + minute() + ":" + second();
    terminal.println(pumpTime);
    String webData = String(pumpTime) + ",event," + "PumpOn" + "," + currentInches;
    */
    sendToLog(1);
    Blynk.virtualWrite(V21, currentInches); //this sends a text through ifttt https://maker.ifttt.com/use/cqrhHsKdQ0CoJINMWN3JmB
    terminal.flush();
    pumpState = true;
  }
  if(pumpState == true && (currentInches < stopPump)){
    digitalWrite(D0, LOW); 
    Blynk.virtualWrite(V11,currentInches);
    led.off();
    /*
    terminal.print("pump Off at "); terminal.print(currentInches); terminal.print("inches. ");
    String pumpTime = String(year()) + month() + day() + "_" + hour() + ":" + minute() + ":" + second();
    String webData = String(pumpTime) + ",event," + "PumpOff" + "," + currentInches;
    Blynk.virtualWrite(V20, webData);
    terminal.println(pumpTime);
    terminal.flush();
    */
    sendToLog(2);
    
    pumpState = false;
  }
}

//to get around the timer limits....a kind of wrapper
void sendToLog1(){
  sendToLog(0);
}

/* logging data -- using mostly global variables, so no passing data around
  *any function that calls this will send data to the server logs
  *the event numbers: 
  * 0 = log the current level (value); 
  * 1 = log a pump on event(with a value); 
  * 2 = log a pump off event (with value);
  * 3 = log a pump trigger on change (with value);
  * 4 = log a pump trigger off change (with value);
*/
void sendToLog(int event){
    String eventName = String("");
    float dataValue;
    switch(event) {
      case 0: 
        //0 = log the current level (value); 
        eventName = "CurrentLevel";
        dataValue = currentInches;
        break;
      case 1: 
        //1 = log a pump on event(with a value); 
        eventName = "PumpOn";
        dataValue = currentInches;
        break;
      case 2: 
        //2 = log a pump off event (with value);
        eventName = "PumpOff";
        dataValue = currentInches;
        break;
      case 3: 
        //3 = log a pump trigger on change (with value); 
        eventName = "PumpTriggerOn";
        dataValue = startPump;
        break;
      case 4: 
        //4 = log a pump trigger off change (with value);
        eventName = "PumpTriggerOff";
        dataValue = stopPump;
        break;
    }
    
    String webData = String(year()) + month() + day() + "_" + hour() + ":" + minute() + ":" + second();
    if(event == 0){
      //send the raw data too
      //String webData = String(pumpTime) + ",log," + theRaw + "," + theInches + "," + totalPumps + "," + startPump + "," + stopPump;
      webData = webData + "," + eventName + "," + dataValue + "," + theRaw;
    } else if(event==1) {
      webData = webData + "," + eventName + "," + dataValue + ",," + totalPumps;
    } else {
      webData = webData + "," + eventName + "," + dataValue;
    }
    Blynk.virtualWrite(V20, webData);
}

// This function sends Arduino's up time every second to Virtual Pin (5).
// In the app, Widget's reading frequency should be set to PUSH. This means
// that you define how often to send data to Blynk App.
void checkWater()
{
  float mainInterval = .25; //if the net change is more than this, then a check will be run to see if pumpstate needs to change
  float pushInterval = .1; //this was going to update the tracker, but it may bot be used if the standard erratic changes are often this anyways
  float inchesNow = getInches();
  float inchesChanged = inchesNow - currentInches;

  //if it changed more than a quarter inch, plus or minus, it will check if it has crossed a threshold
  //this was introduced because the reading often changes even at a standstill, 
  //so fluctuations of a small deggree should be dismissed
  if(inchesChanged >= mainInterval || inchesChanged <= -mainInterval){
    currentInches = inchesNow;
    checkToChange();
  }   
}

void setup() {
  Serial.begin(9600); 
  //Blynk.begin(auth, ssid, pass); //using blynk servers
  //Blynk.begin(auth, SSID, pass, IPAddress(188,166,233,122)); //for the personal server
  Blynk.begin(auth, SSID, pass, BLYNKSERVER);
  // Begin synchronizing time
  //rtc.begin();
  
  //get initial reading for getinches
  currentInches = getInches();
  theRaw = getRaw();
  pumpState = false;
  
  //these functions get called every x milliseconds
  timer.setInterval(300L, checkWater); 
  timer.setInterval(5000L, checkToChange); //this checks if the current level needs to initiate a pump
  timer.setInterval(5000L, sendToLog1); //this sends the data to the server

  //udp/nst stuff
  Udp.begin(localPort);
  setSyncProvider(getNtpTime);
  setSyncInterval(300);
  time_t prevDisplay = 0; // when the digital clock was displayed
  prevDisplay = now();
  
  pinMode(D0, OUTPUT); 
  pinMode(D1, OUTPUT); 
  pinMode(D2, OUTPUT); 
  pinMode(D3, OUTPUT); 
  pinMode(D4, OUTPUT); 
  pinMode(D5, OUTPUT); 
  pinMode(D6, OUTPUT); 
  pinMode(D7, OUTPUT); 
  pinMode(D8, OUTPUT); 
  pinMode(D9, OUTPUT); 
  pinMode(D10, OUTPUT); 
  //pinMode(D11, OUTPUT); 
  //pinMode(D12, OUTPUT); 
  digitalWrite(D0, LOW); 
  digitalWrite(D1, LOW); 
  digitalWrite(D2, LOW); 
  digitalWrite(D3, LOW); 
  digitalWrite(D4, LOW); 
  digitalWrite(D5, LOW); 
  digitalWrite(D6, LOW); 
  digitalWrite(D7, LOW); 
  digitalWrite(D8, LOW); 
  digitalWrite(D9, LOW); 
  digitalWrite(D10, LOW); 
  //digitalWrite(D11, LOW); 
  //digitalWrite(D12, LOW); 
}

void loop() {
  Blynk.run(); 
  timer.run(); // Initiates BlynkTimer
}

void halt() {
  //digitalWrite(D0, LOW); 
  digitalWrite(D1, LOW); 
  digitalWrite(D2, LOW); 
  digitalWrite(D3, LOW); 
  digitalWrite(D4, LOW); 
  digitalWrite(D5, LOW); 
  digitalWrite(D6, LOW); 
  digitalWrite(D7, LOW); 
  digitalWrite(D8, LOW); 
  digitalWrite(D9, LOW); 
  digitalWrite(D10, LOW); 
  //digitalWrite(D11, LOW); 
  //digitalWrite(D12, LOW); 
}

float getRaw(){
  float raw;
  raw = analogRead(AN);
  return raw;
}

float getInches(){
  //https://learn.adafruit.com/thermistor/using-a-thermistor
  reading = 0.0;
  int samples = 10;
  int delayMils = 20; //delaytime between samplings
  for(int i = 0; i <= samples; i++){
    reading = reading + getRaw();
    delay(delayMils);
  }
   
  reading = reading / (samples+1); //to get the average of several samples, perhaps a stabilizing effect.
  theRaw = reading;
  /*
  String pumpTime = String(year()) + month() + day() + "_" + hour() + ":" + minute() + ":" + second();
  String webData = String(pumpTime) + "," + "WaterLevel(raw)" + "," + reading;
  Blynk.virtualWrite(V20, webData);
  */
  //float slope = -0.109090909; // old -  -0.109375
  //float yint = 91.72727273; // old - 92.5625;
  //reading = (reading * slope) + yint;
  //equation for the curve to convert raw to inches: -0.000000843127105863478*x^3 + 0.00152261827505213*x^2 - 0.953414361070571*x + 224.517830111692
  float f3 = -0.000000843127105863478;
  float f2 = 0.00152261827505213;
  float f1 = -0.953414361070571;
  float f0 = 224.517830111692;
  reading = f3*(reading*reading*reading)+f2*(reading*reading)+f1*(reading)+f0;
  /*
  pumpTime = String(year()) + month() + day() + "_" + hour() + ":" + minute() + ":" + second();
  webData = String(pumpTime) + "," + "WaterLevel(in)" + "," + reading;
  Blynk.virtualWrite(V20, webData);
  */
  Blynk.virtualWrite(V8,reading);
  theInches = reading;
  return reading;
}

//various virtual pins get updated
BLYNK_READ(V8)
{
  //Blynk.virtualWrite(V5,theRaw); //sending raw - which was averaged and used to get inches.
  //Blynk.virtualWrite(V6,currentInches); //sending inches
  Blynk.virtualWrite(V8,currentInches); //the visual water level thing looks at this pin
  //Blynk.virtualWrite(V9,currentInches); //the visual water gage thing looks at this pin
}

//terminal widget
BLYNK_WRITE(V1)
{

  // if you type "Marco" into Terminal Widget - it will respond: "Polo:"
  if (String("get") == param.asStr()) {
    float got = getInches();
    terminal.println(got) ;
  } else {
      // Send it back
    terminal.print("You said:");
    terminal.write(param.getBuffer(), param.getLength());
    terminal.println();
  }

  // Ensure everything is sent
  terminal.flush();
}

//if pumpOnValue changes from app
BLYNK_WRITE(V3) {
  if (param[0]){
    startPump = param[0]/10.0;
    sendToLog(3);
    Blynk.virtualWrite(V12,startPump);
    /*
    terminal.print("pump On Level changed to ");
    terminal.println(startPump);
    terminal.flush();
    */
  }
  else
      halt(); 
}

//if pumpOffValue changes from app
BLYNK_WRITE(V4) {
  if (param[0]){
    stopPump = param[0]/10.0;
    sendToLog(4);
    Blynk.virtualWrite(V13,stopPump);
    /*
    terminal.print("pump Off Level changed to ");
    terminal.println(stopPump);
    terminal.flush();
    */
  }
  else
      halt(); 
}

//sends the total pump count.
BLYNK_READ(V0)
{
  //terminal.print("Total pumps: ");
  //terminal.println(totalPumps);
  //terminal.flush();
  Blynk.virtualWrite(V0,totalPumps); //sending total pump count.
}


/*-------- NTP code ----------*/

const int NTP_PACKET_SIZE = 48; // NTP time is in the first 48 bytes of message
byte packetBuffer[NTP_PACKET_SIZE]; //buffer to hold incoming & outgoing packets

time_t getNtpTime()
{
  IPAddress ntpServerIP; // NTP server's ip address

  while (Udp.parsePacket() > 0) ; // discard any previously received packets
  terminal.println("Transmit NTP Request");
  // get a random server from the pool
  WiFi.hostByName(ntpServerName, ntpServerIP);
  terminal.print(ntpServerName);
  terminal.print(": ");
  terminal.println(ntpServerIP);
  sendNTPpacket(ntpServerIP);
  uint32_t beginWait = millis();
  while (millis() - beginWait < 1500) {
    int size = Udp.parsePacket();
    if (size >= NTP_PACKET_SIZE) {
      terminal.println("Receive NTP Response"); terminal.flush();
      Udp.read(packetBuffer, NTP_PACKET_SIZE);  // read packet into the buffer
      unsigned long secsSince1900;
      // convert four bytes starting at location 40 to a long integer
      secsSince1900 =  (unsigned long)packetBuffer[40] << 24;
      secsSince1900 |= (unsigned long)packetBuffer[41] << 16;
      secsSince1900 |= (unsigned long)packetBuffer[42] << 8;
      secsSince1900 |= (unsigned long)packetBuffer[43];
      return secsSince1900 - 2208988800UL + timeZone * SECS_PER_HOUR;
    }
  }
  terminal.println("No NTP Response :-(");terminal.flush();
  return 0; // return 0 if unable to get the time
}

// send an NTP request to the time server at the given address
void sendNTPpacket(IPAddress &address)
{
  // set all bytes in the buffer to 0
  memset(packetBuffer, 0, NTP_PACKET_SIZE);
  // Initialize values needed to form NTP request
  // (see URL above for details on the packets)
  packetBuffer[0] = 0b11100011;   // LI, Version, Mode
  packetBuffer[1] = 0;     // Stratum, or type of clock
  packetBuffer[2] = 6;     // Polling Interval
  packetBuffer[3] = 0xEC;  // Peer Clock Precision
  // 8 bytes of zero for Root Delay & Root Dispersion
  packetBuffer[12] = 49;
  packetBuffer[13] = 0x4E;
  packetBuffer[14] = 49;
  packetBuffer[15] = 52;
  // all NTP fields have been given values, now
  // you can send a packet requesting a timestamp:
  Udp.beginPacket(address, 123); //NTP requests are to port 123
  Udp.write(packetBuffer, NTP_PACKET_SIZE);
  Udp.endPacket();
}


//making the cipher work....

//not sure....
