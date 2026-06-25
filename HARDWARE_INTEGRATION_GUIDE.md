# Sunny Side Up: Industrial IoT Hardware Integration Guide

This document is a comprehensive, production-ready guide for building, wiring, programming, and deploying the physical hardware telemetry logger for the **Sunny Side Up** solar energy indexing system. It covers both major integration routes: **Scenario A (Modbus RTU / RS485)** and **Scenario B (Direct Analog & Non-Invasive Sensor Sampling)**, including complete bills of materials, safety guidelines, exact wire sizes, and step-by-step programming instructions for the ESP32 microcontroller.

---

## 1. Safety & High-Voltage Warning

> [!DANGER]
> **HIGH VOLTAGE RISK**: Solar arrays (PV strings can easily exceed 100V-600V DC) and household utility lines (120V/240V AC) carry lethal voltages.
> - **NEVER** work on live circuits. Open all DC breakers, disconnect MC4 solar panel connectors, and shut off utility mains breakers before making any physical connections.
> - **FUSING IS MANDATORY**: Always install in-line fuses close to power sources (PV panels, battery banks, utility taps) to prevent electrical fires in the event of a short circuit.
> - **ISOLATION IS CRITICAL**: Ensure all low-voltage microcontroller logic (ESP32) is optically, galvanically, or magnetically isolated from high-voltage circuits.

---

## 2. ESP32 Programming Workspace Setup

Before assembling any sensors, you must configure your computer to program the ESP32 microcontroller.

### A. Software & Tooling Required
1. **Integrated Development Environment (IDE)**:
   - **Arduino IDE** (v2.0 or higher) — *Easiest for beginners*.
   - **VS Code + PlatformIO extension** — *Recommended for production-grade development, modular projects, and dependency management*.
2. **USB-to-UART Silicon Bridge Drivers**:
   - Depending on your specific ESP32 development board, download and install the driver for the USB-to-Serial converter chip on the board:
     - **Silicon Labs CP210x USB to UART Bridge Driver**
     - **WCH CH340 / CH341 USB Serial Driver**
   - *Without these drivers, your computer will not detect the COM port of the microcontroller.*
3. **Arduino Library Manager Packages**:
   Install the following libraries using the Library Manager (`Ctrl+Shift+I` in Arduino IDE or via `platformio.ini` dependencies):
   - **ModbusMaster** (by Doc Walker) — For Scenario A (RS485 modbus parsing).
   - **OneWire** (by Paul Stoffregen) — For DS18B20 1-wire protocol.
   - **DallasTemperature** (by Miles Burton) — Temperature probe conversion.
   - **Adafruit ADS1X15** (by Adafruit) — Precision external 16-bit ADC sampling (Scenario B).
   - **EmonLib** (by OpenEnergyMonitor) — RMS calculation algorithms for AC voltage and CT sensors.

### B. Hardware Programming Tooling
- **Microcontroller**: ESP32-S3 Development Board (dual-core 240MHz, 4MB Flash, integrated USB-to-UART bridge).
- **USB Cable**: USB-C or Micro-USB cable (Must support **both Data and Power**. Many charging-only cables will supply power but prevent the device from appearing as a COM port).
- **External Serial Programmer (Only needed for bare ESP32 chips/modules without onboard USB)**:
  - FTDI FT232RL or CP2102 USB-to-TTL Serial adapter.
  - Required pin matches:
    - Programmer TX $\rightarrow$ ESP32 RXD0 (GPIO3)
    - Programmer RX $\rightarrow$ ESP32 TXD0 (GPIO1)
    - Programmer 3V3 $\rightarrow$ ESP32 3V3
    - Programmer GND $\rightarrow$ ESP32 GND
    - Set the programmer's jumper selector to **3.3V** (Connecting 5V directly to ESP32 IO pins will permanently destroy the chip).
- **Jumper Wires**:
  - Male-to-Male (M-M) for breadboard prototyping.
  - Female-to-Female (F-F) for board-to-board pin-out bridging.
  - Male-to-Female (M-F) for bridging breadboard components directly to microcontroller pins.
- **Solderless Breadboard**: For initial prototyping and component validation.

---

## 3. Scenario A: Modbus RTU / RS485 Integration

Typically used to poll smart, professional solar hardware (e.g., EPEver Tracer series charge controllers, Victron SmartSolar controllers, Growatt hybrid inverters) over shielded RS485 communication lines.

```
+----------------+      TXD (GPIO17)     +-----------------+     RS485 Bus     +---------------------+
|                | --------------------> | DI (Data In)    | ================= | A (+) Non-Inverting |
|                |      RXD (GPIO16)     |                 |                   |                     |
|     ESP32      | <-------------------- | RO (Rec Out)    | ================= | B (-) Inverting     |
|                |      RTS (GPIO4)      |                 |                   |                     |
|                | --------------------> | DE & RE pins    | ====[ Gnd ]====== | GND (Reference)     |
+----------------+                       +-----------------+                   +---------------------+
                                            MAX485 Board                           Inverter/MPPT RJ45
```

### A. Scenario A: Bill of Materials (BOM) & Wire Sizes
| Component Name | Technical Specification | Functional Purpose | Qty | Est. Cost | Recommended Wire Gauge / Size |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ESP32-S3 Dev Board** | dual-core, 4MB Flash, USB-C | Central gateway, runs local web server and handles communication. | 1 | $6.00 | **22 AWG Solid Core** (Breadboard / Signal) |
| **MAX485 TTL to RS485 Converter** | 5V TTL logic compatibility, integrated flow-control transceiver | Converts high-speed UART TX/RX from ESP32 to differential balanced RS485 signals. | 1 | $2.50 | **22 AWG Hookup** (TTL) / **24 AWG Twisted-Pair** (RS485) |
| **DS18B20 Temp Probe** | Waterproof stainless steel casing, 1-Wire interface | Clamped to PV panel backsheet to monitor real cell heat metrics. | 1 | $3.50 | **22 AWG Stranded** (Standard pre-attached probe leads) |
| **4.7kΩ Resistor** | 1/4W Metal Film, 1% tolerance | Pull-up resistor from 1-Wire DQ line to 3.3V power bus. | 1 | $0.10 | Axially leaded |
| **120Ω Resistor** | 1/4W Carbon Film, 5% tolerance | RS485 network termination resistor (placed on longest run ends). | 1 | $0.10 | Axially leaded |
| **DIN-Rail PSU** | Mean Well HDR-15-5 (100-240VAC to 5VDC, 2.4A) | Power supply for the ESP32, transceivers, and accessories. | 1 | $12.00 | AC Side: **14 AWG THHN** / DC Side: **20 AWG Hookup** |
| **RS485 Field Cable** | Shielded, Twisted Pair (STP) Cat5e / Cat6 or dedicated RS485 cable | High-noise-immunity physical link from inverter to the ESP32. | - | $10.00 | **24 AWG STP** (Shielded Twisted Pair) |

### B. Scenario A: Hardware Assembly & Installation Step-by-Step
1. **Safety First**: Power down the target solar charge controller / inverter. Ensure no current is running through the communication ports.
2. **Mounting**: Secure a weatherproof IP65 polycarbonate enclosure near the solar equipment. Place a standard DIN rail inside to mount the Mean Well 5V PSU and an ESP32 DIN-rail cradle.
3. **Power Wiring**:
   - Connect AC Mains (Grid or Inverter AC output) to the Mean Well PSU input terminals (`L` and `N`) using **14 AWG solid copper wire**. Protect this tap with an inline **3A or 5A glass cartridge fuse**.
   - Connect the output 5V (`V+`) and Ground (`V-`) from the PSU to the ESP32 board's `5V` (or `VIN`) and `GND` pins using **20 AWG stranded wire**.
4. **TTL-to-RS485 Transceiver Interface**:
   - Connect MAX485 `VCC` pin to ESP32 `5V` pin (using 22 AWG wire).
   - Connect MAX485 `GND` pin to ESP32 `GND` pin.
   - Connect MAX485 `RO` (Receiver Output) $\rightarrow$ ESP32 GPIO16 (RXD2).
   - Connect MAX485 `DI` (Driver Input) $\rightarrow$ ESP32 GPIO17 (TXD2).
   - Bridge MAX485 `DE` (Driver Enable) and `RE` (Receiver Enable, active low) together with a jumper, and connect this joint to ESP32 GPIO4 (RTS). This allows the ESP32 to switch the chip between TX (transmit) mode and RX (receive) mode dynamically.
5. **RS485 Bus Interface**:
   - Connect MAX485 `A` terminal to the charge controller/inverter RS485 positive terminal (usually PIN 5 or 3 on RJ45 connectors, check manufacturer's pin-out manual).
   - Connect MAX485 `B` terminal to the inverter's RS485 negative terminal (usually PIN 6 or 4 on RJ45).
   - Connect the shield drain wire of the STP cable to the Ground terminal of the RS485 port to establish common reference and drain noise.
   - If the cable run exceeds 10 meters, connect a **120Ω carbon film resistor** in parallel between terminals `A` and `B` on the MAX485 board to match line impedance and prevent transmission reflections.
6. **DS18B20 Temp Probe Wiring**:
   - Connect the red wire (VCC) to ESP32 `3.3V` pin.
   - Connect the black wire (GND) to ESP32 `GND` pin.
   - Connect the yellow/white wire (DQ / Data) to ESP32 GPIO15.
   - Place the **4.7kΩ pull-up resistor** directly between the yellow wire (GPIO15) and the red wire (3.3V).
   - Mount the waterproof steel sensor tip securely onto the backside of the closest solar panel using high-thermal-conductivity epoxy or a mechanical metal spring clip.

---

## 4. Scenario B: Direct Analog & Non-Invasive Sensor Sampling

Designed for DIY/custom setups, non-smart hybrid/off-grid inverters, or individual battery bank tracking where digital modbus protocols are unavailable.

```
                                            +---------------------+
  [PV DC Voltages: 0-150V] ===[ 100k ]===== | Ch0                 |
                                            |                     |      I2C Bus      +---------------+
  [ACS758 Current Sensor] ================= | Ch1    ADS1115      | ================= | SDA (GPIO21)  |
                                            |        16-bit ADC   | ================= | SCL (GPIO22)  |
  [ZMPT101B AC Voltage] =================== | Ch2                 |                   |               |
                                            |                     |                   |     ESP32     |
  [SCT-013 CT Sensor] ===================== | Ch3                 |                   |               |
                                            +---------------------+                   +---------------+
```

### A. Scenario B: Bill of Materials (BOM) & Wire Sizes
| Component Name | Technical Specification | Functional Purpose | Qty | Est. Cost | Recommended Wire Gauge / Size |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ESP32-S3 Dev Board** | dual-core, 4MB Flash, USB-C | Central gateway, runs local web server, handles ADS1115 over I2C. | 1 | $6.00 | **22 AWG Solid Core** (Signal / Bus) |
| **ADS1115 16-Bit ADC** | I2C addressable, integrated PGA (Programmable Gain Amplifier) | Provides extremely linear, high-resolution measurements (bypasses noisy ESP32 ADC). | 1 | $4.00 | **22 AWG Solid Core** (I2C Link) |
| **ACS758 Current Sensor** | Bidirectional Hall-Effect Shunt, 50A/100A | Measures high-current solar panel output going into battery controller. | 1 | $8.50 | Shunt Path: **8 AWG / 10 AWG Solar PV Wire** |
| **Voltage Divider Resistors** | 100kΩ and 10kΩ metal film resistors (0.1% precision tolerance) | Steps down raw high-voltage solar DC (e.g. 0-150V) to a safe 0-3.3V range for the ADC. | 1 pair | $1.00 | **20 AWG Hookup Wire** (Fused) |
| **SCT-013-000 AC CT** | Split-Core non-invasive AC current transformer, 100A max, 50mA out | Clamps around live AC lines safely without splicing high-power AC wires. | 1 | $9.00 | Shielded Audio Lead (Pre-attached) |
| **ZMPT101B AC Voltage** | Isolated single-phase active AC voltage sensor module | Safe, step-down optical isolated voltage transformer for AC grid lines. | 1 | $4.50 | AC Input: **16 AWG THHN** (Fused) / Out: **22 AWG** |
| **DS18B20 Temp Probe** | Waterproof stainless steel casing, 1-Wire interface | Measures backsheet cell temperatures. | 1 | $3.50 | **22 AWG Stranded** |
| **In-line Fuse Holder** | Waterproof ATC/ATO format with 1A fuse | Protects the high-voltage DC voltage divider sensing line. | 1 | $3.00 | **18 AWG Stranded** |

### B. Scenario B: Hardware Assembly & Installation Step-by-Step
1. **Safety First**: Shut off all battery isolation switches, solar DC breakers, and AC mains.
2. **Mounting**: Assemble inside an isolated, plastic, fire-retardant electrical utility enclosure. Place high-voltage AC wires inside a dedicated physical barrier partition, separate from the low-voltage ESP32 micro-electronics.
3. **Powering**: Follow the same DIN-rail 5V power supply installation steps as described in Scenario A to supply 5V to the ESP32.
4. **Precision I2C ADC (ADS1115) Wiring**:
   - Connect ADS1115 `VDD` to ESP32 `3.3V` pin (using 22 AWG wire).
   - Connect ADS1115 `GND` to ESP32 `GND` pin.
   - Connect ADS1115 `SDA` to ESP32 GPIO21.
   - Connect ADS1115 `SCL` to ESP32 GPIO22.
5. **High-Voltage PV DC Voltage Divider Setup**:
   - Solder a **100kΩ precision resistor** in series with a **10kΩ precision resistor**.
   - Connect the free leg of the 100kΩ resistor to the positive (+) lead of the PV solar array through an **in-line 1A fuse**. Use **18 AWG hookup wire**.
   - Connect the free leg of the 10kΩ resistor to the negative (-) lead of the PV solar array.
   - Solder a wire from the connection point *between* the 100kΩ and 10kΩ resistors (which acts as a 1/11 voltage divider step-down point) and run it to the **ADS1115 Channel 0 (A0)** input. Use **22 AWG wire**.
   - *Result*: A PV solar voltage of 33V is safely stepped down to 3.0V at the pin, keeping it well within the safe 3.3V range.
6. **DC Current Measurement (ACS758 Shunt)**:
   - Run the main **8 AWG or 10 AWG copper solar wire** coming from the solar panels positive (+) terminal into one heavy copper post of the ACS758. Connect the second heavy copper post to the Solar terminal of the Charge Controller. Ensure terminal lug connections are torqued tightly to prevent hot joints.
   - Connect ACS758 `VCC` to ESP32 `5V` (Hall-sensors require stable 5V reference).
   - Connect ACS758 `GND` to ESP32 `GND`.
   - Connect ACS758 `OUT` (analog signal out) to **ADS1115 Channel 1 (A1)**.
7. **Inverter AC Output Current (SCT-013 CT Probe)**:
   - Clamp the split-core SCT-013 probe around the **live/hot single wire** of the inverter AC output line. Do **not** clamp it around a standard dual-core Romex or household extension cable (the current fields on hot and neutral will cancel each other out, reading 0).
   - Connect the CT sensor's 3.5mm plug to a simple breakout breadboard:
     - Connect one lead to a 1.65V mid-point bias circuit (established by two equal 10kΩ resistors between ESP32 3.3V and GND).
     - Connect the other lead to **ADS1115 Channel 3 (A3)**.
8. **Inverter AC Voltage Sensor (ZMPT101B Module)**:
   - Connect AC Mains Live and Neutral wires to the input terminals of the ZMPT101B module using **16 AWG solid copper wire**, passing the Live leg through an **inline 0.5A fast-acting fuse** for protection.
   - Connect the low-voltage side of the ZMPT101B:
     - `VCC` $\rightarrow$ ESP32 `5V`.
     - `GND` $\rightarrow$ ESP32 `GND`.
     - `OUT` (AC waveform signal output) $\rightarrow$ **ADS1115 Channel 2 (A2)**.

---

## 5. Firmware Programming Instructions

The ESP32 runs an embedded C++ server designed to continuously log telemetry metrics and serve them as JSON payloads when requested by the **Sunny Side Up** user interface.

### Step 1: Open IDE & Select Board
1. Open the **Arduino IDE**.
2. Go to **Tools $\rightarrow$ Board $\rightarrow$ esp32 $\rightarrow$ ESP32S3 Dev Module**.
3. Select your microcontroller's active communication port in **Tools $\rightarrow$ Port** (e.g., `COM3` on Windows or `/dev/cu.usbserial-xxx` on macOS).
   - *If no ports are visible, double-check that your Silicon CP210x or CH340 drivers are installed and that your USB cable is not power-only.*

### Step 2: Input and Configure the Firmware
Choose the correct scenario code (found below) and write/paste it into your sketch file. 

#### Set Network Mode
Update your configuration variables to match your system deployment parameters:
- **Station Mode (STA)**: Best for home-linked grids. Sets the ESP32 as a client on your home router.
  ```cpp
  const char* ssid = "YOUR_HOME_WIFI_SSID";
  const char* password = "YOUR_HOME_WIFI_PASSWORD";
  ```
- **Access Point Mode (AP)**: Best for fully isolated off-grid camps. The ESP32 hosts its own private, secure network:
  ```cpp
  const char* ap_ssid = "Sunny-Side-Up-Gateway";
  const char* ap_password = "sunnyside_secure_123";
  ```

---

### Step 3: Flash the Microcontroller
1. Click the **Verify** button (check-mark icon) to compile the code and ensure all libraries are correctly installed.
2. Click the **Upload** button (right-arrow icon) to write the compiled firmware to the ESP32.
3. **Boot troubleshooting**: If you get a connection timeout error (`Failed to connect to ESP32: No serial data received`), put the board into manual flashing mode:
   - Press and hold the **BOOT (or IO0) button** on the ESP32.
   - Click **Upload** in the IDE.
   - Once you see `Connecting...` in the console, release the **BOOT button**.
   - The IDE will finish flashing the module.

---

## 6. Software Implementation Codes

### Option A Source Code: Modbus RTU / RS485 Gateway

```cpp
/*
  ================================================================================
  SUNNY SIDE UP TELEMETRY GATEWAY (ESP32-S3)
  Scenario A: Modbus RTU (RS485 Master Transceiver Interface)
  ================================================================================
*/
#include <WiFi.h>
#include <WebServer.h>
#include <ModbusMaster.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// --- NETWORK CONFIGURATION ---
// Set to 1 for Station Mode (Home Wi-Fi), 0 for Standalone Access Point Mode
#define WIFI_MODE_STA 1

#if WIFI_MODE_STA
  const char* ssid = "YOUR_HOME_WIFI_SSID";
  const char* password = "YOUR_HOME_WIFI_PASSWORD";
#else
  const char* ap_ssid = "Sunny-Side-Up-Gateway";
  const char* ap_password = "sunnyside_secure_123";
  IPAddress local_ip(192, 168, 4, 1);
  IPAddress gateway(192, 168, 4, 1);
  IPAddress subnet(255, 255, 255, 0);
#endif

// Web Server Port (Standard HTTP)
WebServer server(80);

// --- PINOUT DECLARATIONS ---
#define RXD2 16  // ESP32 RX Pin -> MAX485 RO Pin
#define TXD2 17  // ESP32 TX Pin -> MAX485 DI Pin
#define RTS  4   // MAX485 DE & RE Pins (Flow Control) - High=TX, Low=RX
#define ONE_WIRE_BUS 15 // DS18B20 Temp Probe signal line

// 1-Wire Bus setup
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// Modbus Master Instance
ModbusMaster node;

// Telemetry Registers
float pv_voltage = 0.0;
float pv_current = 0.0;
float pv_power = 0.0;
float ac_voltage = 0.0;
float ac_current = 0.0;
float ac_power = 0.0;
float panel_temp = 0.0;
float conversion_efficiency = 0.0;

// Flow control callbacks
void preTransmission() {
  digitalWrite(RTS, HIGH); 
}

void postTransmission() {
  digitalWrite(RTS, LOW); 
}

void setup() {
  Serial.begin(115200);
  pinMode(RTS, OUTPUT);
  digitalWrite(RTS, LOW); // Start in listening (RX) mode

  // Initialize Hardware Serial 2 (Standard Modbus speed: 9600 baud, 8 Data bits, 1 Stop bit, No parity)
  Serial2.begin(9600, SERIAL_8N1, RXD2, TXD2);

  sensors.begin();

  // Modbus node ID 1 (standard default inverter/controller device ID)
  node.begin(1, Serial2);
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);

  // Initialize Wi-Fi
#if WIFI_MODE_STA
  Serial.print("Connecting to local Wi-Fi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi Connected successfully.");
  Serial.print("Access Local IP Address: ");
  Serial.println(WiFi.localIP());
#else
  Serial.println("Configuring Standalone Access Point...");
  WiFi.softAPConfig(local_ip, gateway, subnet);
  WiFi.softAP(ap_ssid, ap_password);
  Serial.print("SSID Gateway Active: ");
  Serial.println(ap_ssid);
  Serial.print("Point your browser to IP: ");
  Serial.println(WiFi.softAPIP());
#endif

  // CORS and JSON Endpoint Handling
  server.on("/api/telemetry", HTTP_GET, handleTelemetryRoute);
  server.on("/api/telemetry", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });

  server.begin();
  Serial.println("Sunny Side Up telemetry server running.");
}

void loop() {
  server.handleClient();
  
  static unsigned long lastPollTime = 0;
  if (millis() - lastPollTime > 5000) { // Poll sensors every 5 seconds
    pollModbusRegisters();
    readTemperature();
    lastPollTime = millis();
  }
}

void pollModbusRegisters() {
  uint8_t result;
  
  // Read Charge Controller Real-Time Input Registers (EPEver Tracer maps starting at 0x3100)
  result = node.readInputRegisters(0x3100, 4);
  if (result == node.ku8MBSuccess) {
    pv_voltage = node.getResponseBuffer(0x00) / 100.0;
    pv_current = node.getResponseBuffer(0x01) / 100.0;
    
    uint32_t power_high = node.getResponseBuffer(0x03);
    uint32_t power_low = node.getResponseBuffer(0x02);
    pv_power = ((power_high << 16) | power_low) / 100.0;
    
    Serial.println("--- MODBUS UPDATE ---");
    Serial.printf("PV VOLTS: %.2f V | PV AMPS: %.2f A | PV WATTS: %.1f W\n", pv_voltage, pv_current, pv_power);
  } else {
    Serial.printf("Error polling PV registers! Code: 0x%02X\n", result);
  }

  // Read Grid / Inverter Real-Time AC Output Registers (Starting at 0x310C)
  result = node.readInputRegisters(0x310C, 4);
  if (result == node.ku8MBSuccess) {
    ac_voltage = node.getResponseBuffer(0x00) / 100.0;
    ac_current = node.getResponseBuffer(0x01) / 100.0;
    
    uint32_t ac_pow_high = node.getResponseBuffer(0x03);
    uint32_t ac_pow_low = node.getResponseBuffer(0x02);
    ac_power = ((ac_pow_high << 16) | ac_pow_low) / 100.0;
    
    Serial.printf("AC VOLTS: %.1f V | AC AMPS: %.2f A | AC WATTS: %.1f W\n", ac_voltage, ac_current, ac_power);
  } else {
    Serial.printf("Error polling AC registers! Code: 0x%02X\n", result);
  }

  // Calculate efficiency
  if (pv_power > 5.0) {
    conversion_efficiency = (ac_power / pv_power) * 100.0;
    if (conversion_efficiency > 100.0) conversion_efficiency = 100.0;
  } else {
    conversion_efficiency = 0.0;
  }
}

void readTemperature() {
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);
  if (tempC != DEVICE_DISCONNECTED_C) {
    panel_temp = tempC;
  }
}

void handleTelemetryRoute() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  
  String json = "{";
  json += "\"solarVolts\":" + String(pv_voltage, 1) + ",";
  json += "\"solarAmps\":" + String(pv_current, 2) + ",";
  json += "\"solarWatts\":" + String(pv_power, 0) + ",";
  json += "\"inverterVolts\":" + String(ac_voltage, 1) + ",";
  json += "\"inverterAmps\":" + String(ac_current, 2) + ",";
  json += "\"inverterWatts\":" + String(ac_power, 0) + ",";
  json += "\"efficiency\":" + String(conversion_efficiency, 1) + ",";
  json += "\"lossWatts\":" + String(fmax(0.0f, pv_power - ac_power), 0) + ",";
  json += "\"panelTemp\":" + String(panel_temp, 0) + ",";
  json += "\"gridFreq\":60.0,";
  json += "\"weather\":\"sunny\"";
  json += "}";
  
  server.send(200, "application/json", json);
}
```

---

### Option B Source Code: Direct Analog Sensors & Shunts

```cpp
/*
  ================================================================================
  SUNNY SIDE UP TELEMETRY GATEWAY (ESP32-S3)
  Scenario B: Direct Analog & Non-Invasive Sensor Sampling
  ================================================================================
*/
#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// --- NETWORK CONFIGURATION ---
#define WIFI_MODE_STA 1

#if WIFI_MODE_STA
  const char* ssid = "YOUR_HOME_WIFI_SSID";
  const char* password = "YOUR_HOME_WIFI_PASSWORD";
#else
  const char* ap_ssid = "Sunny-Side-Up-Gateway";
  const char* ap_password = "sunnyside_secure_123";
  IPAddress local_ip(192, 168, 4, 1);
  IPAddress gateway(192, 168, 4, 1);
  IPAddress subnet(255, 255, 255, 0);
#endif

// Web Server Port
WebServer server(80);

// External High-Precision 16-Bit ADC
Adafruit_ADS1115 ads;

// 1-Wire Pin Assignment
#define ONE_WIRE_BUS 15 
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// --- ANALOG CALIBRATION COEFFICIENTS ---
// Step-down ratio of 100kΩ / 10kΩ voltage divider (11.0 theoretical multiplier)
const float DC_VOLT_DIVIDER_RATIO = 11.0; 
// Sensitivity of ACS758 sensor (40mV / Amp for 50A bi-directional model)
const float ACS758_SENSITIVITY = 0.040;  
// Reference midpoint (2.50V zero-point for ACS758)
const float ACS758_VREF = 2.500;         

// Telemetry Registers
float pv_voltage = 0.0;
float pv_current = 0.0;
float pv_power = 0.0;
float ac_voltage = 120.0; // Standard domestic baseline
float ac_current = 0.0;
float ac_power = 0.0;
float panel_temp = 25.0;
float conversion_efficiency = 0.0;

void setup() {
  Serial.begin(115200);
  
  // Start standard I2C (SDA=GPIO21, SCL=GPIO22 on dev boards)
  Wire.begin(21, 22);
  
  if (!ads.begin()) {
    Serial.println("CRITICAL: ADS1115 external ADC module not found!");
  } else {
    // GAIN_ONE matches up to +/- 4.096V max input limit
    ads.setGain(GAIN_ONE);
  }

  sensors.begin();

  // Initialize Wi-Fi
#if WIFI_MODE_STA
  Serial.print("Connecting to Wi-Fi: ");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWi-Fi connection established.");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
#else
  WiFi.softAPConfig(local_ip, gateway, subnet);
  WiFi.softAP(ap_ssid, ap_password);
  Serial.print("SSID Gateway Online: ");
  Serial.println(ap_ssid);
#endif

  // Route Handling
  server.on("/api/telemetry", HTTP_GET, handleTelemetryRoute);
  server.on("/api/telemetry", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });

  server.begin();
  Serial.println("Analog Gateway server running.");
}

void loop() {
  server.handleClient();
  
  static unsigned long lastReadingTime = 0;
  if (millis() - lastReadingTime > 4000) { // Refresh analog metrics every 4 seconds
    readDCVoltage();
    readDCCurrent();
    readACMetrics();
    readTemperature();
    
    // Core electrical power formula
    pv_power = pv_voltage * pv_current;
    
    if (pv_power > 10.0) {
      conversion_efficiency = (ac_power / pv_power) * 100.0;
      if (conversion_efficiency > 100.0) conversion_efficiency = 100.0;
    } else {
      conversion_efficiency = 0.0;
    }
    
    lastReadingTime = millis();
  }
}

void readDCVoltage() {
  // Read A0 (Voltage Divider Sense Pin)
  int16_t raw_adc0 = ads.readADC_SingleEnded(0);
  float voltsPin = ads.computeVolts(raw_adc0);
  
  // Apply multiplier to compute actual array voltage
  pv_voltage = voltsPin * DC_VOLT_DIVIDER_RATIO;
  
  Serial.println("--- DIRECT ANALOG READS ---");
  Serial.printf("PV DC BUS: %.1f V (Pin Volt: %.3f V)\n", pv_voltage, voltsPin);
}

void readDCCurrent() {
  // Read A1 (ACS758 current shunt signal)
  int16_t raw_adc1 = ads.readADC_SingleEnded(1);
  float sensorVolt = ads.computeVolts(raw_adc1);
  
  // Calculate current based on Hall voltage drift from center reference (2.5V)
  pv_current = abs((sensorVolt - ACS758_VREF) / ACS758_SENSITIVITY);
  
  if (pv_current < 0.15) pv_current = 0.0; // Filter micro-noise threshold
  Serial.printf("PV DC AMPS: %.2f A (Pin Volt: %.3f V)\n", pv_current, sensorVolt);
}

void readACMetrics() {
  // ZMPT101B AC Transformer Peak Sampling on A2
  unsigned long start_time = millis();
  float max_signal_volt = 0.0;
  
  while (millis() - start_time < 20) { // Sample over 1 full 50Hz/60Hz AC wave
    int16_t raw_adc2 = ads.readADC_SingleEnded(2);
    float val = ads.computeVolts(raw_adc2);
    if (val > max_signal_volt) {
      max_signal_volt = val;
    }
  }
  
  // Strip offset bias (usually 1.65V center)
  float peak_ac_volt = abs(max_signal_volt - 1.65);
  ac_voltage = peak_ac_volt * 170.0; // Standard calibration constant (Tweak to match multimeter)
  if (ac_voltage < 30.0) ac_voltage = 0.0;

  // SCT-013 RMS AC Current transformer on A3
  float current_sum_squares = 0;
  int raw_sample_count = 0;
  unsigned long rms_timer = millis();
  
  while (millis() - rms_timer < 40) { // Sample over 2 full waves
    int16_t raw_adc3 = ads.readADC_SingleEnded(3);
    float volt_deviation = ads.computeVolts(raw_adc3) - 1.65;
    current_sum_squares += (volt_deviation * volt_deviation);
    raw_sample_count++;
  }
  
  float rms_signal_volts = sqrt(current_sum_squares / raw_sample_count);
  ac_current = rms_signal_volts * 30.0; // Calibrated ratio (1V RMS output = 30 Amps grid-current)
  if (ac_current < 0.08) ac_current = 0.0;
  
  ac_power = ac_voltage * ac_current * 0.95; // Power factor multiplier
  Serial.printf("AC MAIN VOLTS: %.1f V | AC MAIN AMPS: %.2f A | AC POWER: %.1f W\n", ac_voltage, ac_current, ac_power);
}

void readTemperature() {
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);
  if (tempC != DEVICE_DISCONNECTED_C) {
    panel_temp = tempC;
  }
}

void handleTelemetryRoute() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  
  String json = "{";
  json += "\"solarVolts\":" + String(pv_voltage, 1) + ",";
  json += "\"solarAmps\":" + String(pv_current, 2) + ",";
  json += "\"solarWatts\":" + String(pv_power, 0) + ",";
  json += "\"inverterVolts\":" + String(ac_voltage, 1) + ",";
  json += "\"inverterAmps\":" + String(ac_current, 2) + ",";
  json += "\"inverterWatts\":" + String(ac_power, 0) + ",";
  json += "\"efficiency\":" + String(conversion_efficiency, 1) + ",";
  json += "\"lossWatts\":" + String(fmax(0.0f, pv_power - ac_power), 0) + ",";
  json += "\"panelTemp\":" + String(panel_temp, 0) + ",";
  json += "\"gridFreq\":60.0,";
  json += "\"weather\":\"cloudy\"";
  json += "}";
  
  server.send(200, "application/json", json);
}
```

---

## 7. Connecting the ESP32 Gateway to the Sunny Side Up Dashboard

The web portal is pre-engineered to automatically receive real-time streams from your physical ESP32 gateway.

### Setup Instructions:
1. Note the IP address displayed in the Arduino Serial Monitor after flashing the ESP32 (e.g. `192.168.1.145` or `192.168.4.1`).
2. Open the **Sunny Side Up** web browser application.
3. In the **Hardware Integration Options** sidebar, toggle the **Auto-Refresh (Polled API)** mode on.
4. Input your physical gateway's local IP address into the **Telemetry IP Address Input Field**.
5. Click **Establish Link**. The web app will establish a secure CORS communication handshake and start feeding live physical data charts in place of simulated records.
1. Correct Resistor Values for 72V Max PV Input

1. Option A (Highly Recommended & Safest) — Designed for up to 100V Peak
This option leaves plenty of headroom for extreme winter voltage spikes (
 rise in freezing temperatures).
High-side Resistor (
): 100 kΩ (100,000 ohms)
Low-side Resistor (
): 3.3 kΩ (3,300 ohms)
Actual Voltage Division Ratio: 31.3 (calculated as 
)
Performance Metrics:
At 72V Input: Out-signal is 2.30V (perfectly safe, high resolution).
At 90V Input (extreme cold weather open-circuit spike): Out-signal is 2.87V (remains safely under the 3.3V max limit).
Firmware Constant: Change DC_VOLT_DIVIDER_RATIO in your ESP32 code to 31.3.
Option B (Maximum Resolution) — Designed for up to 80V Peak
This option maximizes the 16-bit voltage resolution of the ADS1115 but offers less protection against extreme over-voltage spikes.
High-side Resistor (
): 100 kΩ (100,000 ohms)
Low-side Resistor (
): 4.3 kΩ (4,300 ohms)
Actual Voltage Division Ratio: 24.25 (calculated as 
)
Performance Metrics:
At 72V Input: Out-signal is 2.97V (uses nearly the entire 0-3V range for maximum precision).
At 80V Input: Out-signal is 3.30V (reaches the safe maximum input ceiling).
Firmware Constant: Change DC_VOLT_DIVIDER_RATIO in your ESP32 code to 24.25.
2. Comprehensive Systems Analysis: Risks, Hurdles, & Unforeseen Issues
Integrating hardware, firmware, local networks, and a cloud-synced web app (Tauri/React) is a multi-disciplinary challenge. Below is a breakdown of potential problems you might encounter, followed by practical mitigations.
⚡ Hardware Vulnerabilities & Safe Practices
The Issue: If your ESP32 is powered via a USB port connected to a laptop that is plugged into a wall outlet, and your solar inverter or battery bank shares a different physical ground, a ground loop will form. Large current flows can travel back up through your ESP32, frying the chip, the sensors, and potentially your laptop's USB port.
The Solution:
Isolate the Power: Power your ESP32 from an isolated source (such as a battery pack or a high-quality, isolated step-down buck converter connected directly to your system).
Isolate the Bus: Use an isolated RS485 transceiver (such as a module containing a magnetic isolator or optocouplers) rather than a direct common-ground transceiver like the basic MAX485.
The Issue: Precision is highly dependent on resistor quality. Standard carbon film resistors have a 
 tolerance and can drift with heat. Additionally, solar charge controllers use high-frequency Pulse Width Modulation (PWM) or MPPT switching, which injects severe electrical noise onto the PV lines.
The Solution:
Use 0.1% or 1% Metal-Film Resistors for 
 and 
 to prevent reading drift.
Place a 0.1 µF (100nF) ceramic capacitor in parallel with the low-side resistor (
). This forms a low-pass filter that cleans up switching noise before the ADC reads it.
The Issue: 72V DC is high enough to sustain an electric arc. A short circuit on the breadboard could trigger a fire or melt components instantly.
The Solution: Install a fast-acting 1A fuse inline on the positive lead right at the tap point of your solar panel or battery, before the long wire runs to your sensing board.
🌐 Software & Networking Boundaries
The Issue: When you deploy this React app to Google Cloud Run, it serves over a secure https:// connection. If your app attempts to poll the ESP32 directly via its local home IP address (e.g., http://192.168.1.145/api/telemetry), the browser will block the request under security guidelines called "Mixed Content Blockers."
The Solution:
Tauri Desktop App: Running your app within Tauri circumvents this because Tauri operates on a custom protocol (tauri:// or asset://) where standard browser security sandboxing is disabled, allowing direct local HTTP requests.
Cloud Inversion (Push instead of Pull): Instead of the web dashboard requesting data from the ESP32, program the ESP32 to push its data directly up to your Firebase Firestore database every 5 seconds. The React client then simply listens to Firestore updates. This resolves all local IP routing issues and allows you to view your telemetry anywhere in the world!
The Issue: If your home internet goes down, or the gateway is situated out of range of your router, the ESP32 will hang, blocking loop execution, or telemetry data will simply be lost forever.
The Solution:
Implement non-blocking Wi-Fi reconnect attempts in your firmware (WiFi.setAutoReconnect(true)).
Unforeseen Feature: Add a MicroSD card breakout module or utilize the ESP32's internal SPIFFS/LittleFS storage. If the Wi-Fi connection fails, log your telemetry locally. Once internet connectivity is restored, push the cached offline records up to Firestore.
🔍 User Errors & Deployment Pitfalls
Wiring Swap on RS485: The A(+) and B(-) lines on different manufacturers' RS485 modems are notoriously mislabeled or inverted (sometimes labeled Tx/Rx, +/- or D+/D-). If you cannot establish a Modbus handshake, swap the A and B wires. This is harmless and fixes communication 90% of the time.
MAX485 Flow Control Timing: The basic MAX485 chip requires you to manually pull the DE (Driver Enable) and RE (Receiver Enable) pins High to transmit, and Low to receive. If your firmware timing is off by even a few microseconds, it will truncate the Modbus packet.
Tip: Buy a MAX485 module with automatic flow control (typically red modules with 5 pins on the TTL side). They handle the TX/RX switching automatically in hardware, requiring only TX, RX, VCC, and GND pins.


