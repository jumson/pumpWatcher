# pumpWatchman
Had a problem with my sewage pump switch sometimes not working. This is a solution I developed to ensure monitoring of sewage/water levels, notification of main switch failure, and an alternative switch for operating the pump.

The basic idea is centered on an ESP8266 that monitors a sensor (eTape: https://milonetech.com/products/standard-etape-assembly), and controls a relay connected to a seperate power plug than the main pump switch.

The main pump switch is a piggyback plug what controls current through it. This solution is also a piggyback plug, except it is a passthrough device with a plug to plug it into another outlet.

the pumpWatchman will allow the main switch to operate as designed, but when the pump is not switched on as the water level reaches a certain height, the pumpWatchman closes he relay and allows the pump to turn on until the water level lowers to a safe distance.

Through the Blynk API, the ESP8266 also updates a database on a webserver I made specifically to catch the data and log it, as well as to display it / allow for dowlload when requested.

The Blynk API also allows for me to monitor the water levels and adjust the triggers (for pump on and pump off) on my android phone.
