import { useState } from 'react';
import { Cpu, Terminal, Layers, Wifi, Copy, Check, List, HelpCircle, HardDrive, Settings, Zap, Sun, Activity, Play, RefreshCw, AlertCircle, CheckCircle2, Info, ChevronRight, Search, ExternalLink } from 'lucide-react';

export function HardwareIntegration() {
  const [selectedScenario, setSelectedScenario] = useState<'modbus' | 'analog'>('modbus');
  const [wifiMode, setWifiMode] = useState<'sta' | 'ap'>('sta');
  const [copied, setCopied] = useState(false);
  const [rightTab, setRightTab] = useState<'diagram' | 'code'>('diagram');
  const [selectedWire, setSelectedWire] = useState<string | null>(null);
  const [verificationState, setVerificationState] = useState<'idle' | 'running' | 'success'>('idle');
  const [verificationLogs, setVerificationLogs] = useState<string[]>([]);

  const wireDetails: Record<string, {
    name: string;
    gauge: string;
    type: string;
    connection: string;
    purpose: string;
    safety: string;
    color: string;
  }> = {
    'modbus-5v': {
      name: "5V Main DC Power Link",
      gauge: "20 AWG Stranded Copper",
      type: "UL1007 Hookup Wire (Red)",
      connection: "Mean Well 5V Output (+) to ESP32 VIN and MAX485 VCC",
      purpose: "Supplies stable regulated 5V power to the microcontroller and transceiver.",
      safety: "Ensure voltage does not exceed 5.5V. Protect the AC input of the Mean Well PSU with a 3A cartridge fuse.",
      color: "#EF4444"
    },
    'modbus-gnd': {
      name: "System Ground (GND) Bus",
      gauge: "20 AWG Stranded Copper",
      type: "UL1007 Hookup Wire (Black)",
      connection: "Mean Well V- to ESP32 GND, MAX485 GND, and RS485 Shield Ground",
      purpose: "Establishes a common voltage reference plane across all modules to minimize serial communication noise.",
      safety: "Ensure all grounds are star-connected to a single common point to eliminate ground loops.",
      color: "#64748B"
    },
    'modbus-rts': {
      name: "RS485 Directional Flow Control (RTS)",
      gauge: "22 AWG Solid Core",
      type: "Standard Breadboard / PCB wire",
      connection: "ESP32 GPIO4 to MAX485 DE & RE Pins",
      purpose: "Switches the MAX485 between Transmit (High) and Receive (Low) modes.",
      safety: "Do not let this pin float. A floating RTS pin leads to random transmit failures.",
      color: "#3B82F6"
    },
    'modbus-tx': {
      name: "Hardware UART Serial TX Line",
      gauge: "22 AWG Solid Core",
      type: "Standard Hookup Wire",
      connection: "ESP32 GPIO17 (TX2) to MAX485 DI Pin",
      purpose: "Carries high-speed serial data blocks from the ESP32 CPU into the RS485 transceiver.",
      safety: "Keep signal wire short and separated from AC power lines.",
      color: "#10B981"
    },
    'modbus-rx': {
      name: "Hardware UART Serial RX Line",
      gauge: "22 AWG Solid Core",
      type: "Standard Hookup Wire",
      connection: "ESP32 GPIO16 (RX2) to MAX485 RO Pin",
      purpose: "Receives differential data frames from the MAX485 and delivers them to the ESP32 serial buffer.",
      safety: "Check orientation - connecting RX to DI (instead of RO) will cause silent failures.",
      color: "#A855F7"
    },
    'modbus-rs485a': {
      name: "RS485 Differential A(+) Communication Line",
      gauge: "24 AWG Shielded Twisted Pair (STP)",
      type: "Cat5e / Cat6 twisted core (Orange/White)",
      connection: "MAX485 Terminal A to Inverter RS485 A(+) Port",
      purpose: "Positive leg of the balanced industrial RS485 differential communication link.",
      safety: "Always use a twisted pair with B(-) to benefit from common-mode noise cancellation.",
      color: "#F97316"
    },
    'modbus-rs485b': {
      name: "RS485 Differential B(-) Communication Line",
      gauge: "24 AWG Shielded Twisted Pair (STP)",
      type: "Cat5e / Cat6 twisted core (Orange)",
      connection: "MAX485 Terminal B to Inverter RS485 B(-) Port",
      purpose: "Negative leg of the balanced industrial RS485 differential communication link.",
      safety: "Install a 120Ω resistor across terminals A and B if the transmission line length exceeds 10 meters.",
      color: "#EAB308"
    },
    'modbus-temp': {
      name: "DS18B20 1-Wire Data Bus",
      gauge: "22 AWG solid copper",
      type: "Waterproof probe lead (Yellow)",
      connection: "ESP32 GPIO15 to DS18B20 DQ lead with a 4.7kΩ pull-up to 3.3V",
      purpose: "Carries digital temperature readings from the solar panel silicon cells.",
      safety: "The 4.7kΩ pull-up resistor between data (DQ) and 3.3V is absolutely mandatory for digital 1-Wire operations.",
      color: "#14B8A6"
    },
    'analog-3v3': {
      name: "3.3V Precision Logic Supply",
      gauge: "22 AWG Solid Core",
      type: "UL1007 Hookup Wire (Red)",
      connection: "ESP32 3V3 Pin to ADS1115 VDD and DS18B20 VCC",
      purpose: "Supplies filtered low-noise reference voltage to the 16-bit analog-to-digital converter.",
      safety: "Do not draw more than 150mA from the ESP32 3.3V regulator pin to avoid overheating.",
      color: "#EF4444"
    },
    'analog-gnd': {
      name: "System Logic Ground (GND)",
      gauge: "20 AWG Stranded Copper",
      type: "UL1007 Hookup Wire (Black)",
      connection: "ESP32 GND to ADS1115 GND, Sensor GNDs, and divider common",
      purpose: "Establishes common zero-volt reference for all analog sensing modules.",
      safety: "Keep analog ground separate from heavy high-power inverter AC ground loops.",
      color: "#64748B"
    },
    'analog-sda': {
      name: "I2C Serial Data Line (SDA)",
      gauge: "22 AWG Solid Core",
      type: "Standard Hookup Wire",
      connection: "ESP32 GPIO21 to ADS1115 SDA",
      purpose: "High-speed bi-directional digital data line for sensor register updates.",
      safety: "If using long wires, add external 4.7kΩ pull-up resistors to 3.3V to prevent I2C packet drops.",
      color: "#10B981"
    },
    'analog-scl': {
      name: "I2C Serial Clock Line (SCL)",
      gauge: "22 AWG Solid Core",
      type: "Standard Hookup Wire",
      connection: "ESP32 GPIO22 to ADS1115 SCL",
      purpose: "Synchronizes byte-transfer between ESP32 master and ADS1115 slave ADC.",
      safety: "Route SDA and SCL close together to minimize electromagnetic interference.",
      color: "#3B82F6"
    },
    'analog-a0': {
      name: "Stepped-Down DC Voltage (A0)",
      gauge: "22 AWG Solid Core",
      type: "Standard Hookup Wire (Purple)",
      connection: "Voltage Divider Junction to ADS1115 Channel 0 (A0)",
      purpose: "Carries 0-3.3V analog representation of the high-voltage (0-150V) PV array.",
      safety: "The input side of the divider handles fatal PV voltages. Install an inline 1A fuse on the PV positive line.",
      color: "#8B5CF6"
    },
    'analog-a1': {
      name: "DC Current Signal (A1)",
      gauge: "22 AWG Solid Core",
      type: "Standard Hookup Wire (Amber)",
      connection: "ACS758 Shunt OUT Pin to ADS1115 Channel 1 (A1)",
      purpose: "Carries isolated analog voltage proportional to DC charging current (e.g. 40mV per Amp).",
      safety: "Ensure the ACS758 current path lugs are fully torqued. Loose joints can generate lethal electrical arcs.",
      color: "#F59E0B"
    },
    'analog-a2': {
      name: "Isolated AC Voltage Signal (A2)",
      gauge: "22 AWG Solid Core",
      type: "Standard Hookup Wire (Orange)",
      connection: "ZMPT101B OUT Pin to ADS1115 Channel 2 (A2)",
      purpose: "Carries isolated step-down sine wave representing live grid/inverter levels.",
      safety: "The high-voltage side of the ZMPT101B ties to 120V/240V AC. Double check insulating heat shrink on high voltage pins.",
      color: "#F97316"
    },
    'analog-a3': {
      name: "AC Current CT Signal (A3)",
      gauge: "22 AWG Shielded Audio Lead",
      type: "Breakout Wire (Violet)",
      connection: "SCT-013 Burden resistor node to ADS1115 Channel 3 (A3)",
      purpose: "Carries induced AC current measurement wave from the split-core transformer clamp.",
      safety: "Never open the CT plug while clamped on a live line; always clamp the sensor around a single hot line.",
      color: "#14B8A6"
    }
  };

  const runDiagnosticCheck = () => {
    setVerificationState('running');
    setVerificationLogs([]);
    
    const logsList = selectedScenario === 'modbus' ? [
      "[INFO] Initializing UART-to-RS485 bridge on Serial2...",
      "[INFO] Configuring ESP32 GPIO4 as Flow Control (RTS)...",
      "[SUCCESS] Transceiver hardware initialized in half-duplex mode.",
      "[INFO] Probing 1-Wire sensor bus on GPIO15...",
      "[SUCCESS] Found 1 DS18B20 digital temperature probe.",
      "[INFO] Querying slave address 0x01 Input Registers (0x3100)...",
      "[SUCCESS] Received 8 bytes from MPPT Charge Controller.",
      " -> Solar Voltage: 88.4V VDC | Solar Current: 15.2A ADC",
      "[INFO] Querying slave address 0x01 AC Output Registers (0x310C)...",
      "[SUCCESS] Received 8 bytes from Inverter.",
      " -> Inverter Output: 119.8V VAC | Inverter Current: 5.4A AAC",
      "[SUCCESS] Handshake successful! ESP32-S3 reporting stable telemetry stream."
    ] : [
      "[INFO] Initializing High-Precision I2C bus on SCL (GPIO22) / SDA (GPIO21)...",
      "[INFO] Probing ADS1115 I2C node address 0x48...",
      "[SUCCESS] 16-Bit ADS1115 external ADC detected and responding.",
      "[INFO] Scanning 1-Wire temperature bus on GPIO15...",
      "[SUCCESS] Found 1 DS18B20 digital temperature probe.",
      "[INFO] Sampling Analog Inputs...",
      " -> A0 (PV Voltage): Stepped-down 1.22V (Calculated: 13.4V VDC) - OK",
      " -> A1 (PV Amperage): Sensed offset 2.58V (Calculated: 2.0A ADC) - OK",
      " -> A2 (AC Voltage): Sinusoidal sweep peak 2.65V (Calculated: 120.1V VAC) - OK",
      " -> A3 (AC Amperage): RMS delta 0.08V (Calculated: 2.4A AAC) - OK",
      "[SUCCESS] Handshake successful! ESP32-S3 reporting healthy analog sensor levels."
    ];

    logsList.forEach((log, index) => {
      setTimeout(() => {
        setVerificationLogs(prev => [...prev, log]);
        if (index === logsList.length - 1) {
          setVerificationState('success');
        }
      }, (index + 1) * 350);
    });
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getBOM = () => {
    if (selectedScenario === 'modbus') {
      return [
        { 
          name: 'ESP32-S3 Development Board', 
          spec: 'Dual-core 240MHz, 4MB Flash, Wi-Fi & BLE', 
          purpose: 'Core processor, handles networking, Modbus transceiver polling, and web server.', 
          cost: '$6.00',
          amazonSearch: 'ESP32-S3 development board Type-C'
        },
        { 
          name: 'RS485 to TTL MAX485 Converter', 
          spec: '5V TTL to RS485 converter, auto flow control recommended', 
          purpose: 'Bridges hardware Serial from ESP32 to the RS485 balanced lines of the inverter/MPPT.', 
          cost: '$2.50',
          amazonSearch: 'MAX485 TTL to RS485 converter auto flow'
        },
        { 
          name: 'DS18B20 Waterproof Temp Probe', 
          spec: '1-Wire interface, stainless steel cap, -55°C to +125°C', 
          purpose: 'Clamps directly to PV backsheet to measure cell surface temperature.', 
          cost: '$3.50',
          amazonSearch: 'DS18B20 waterproof temperature sensor probe'
        },
        { 
          name: '4.7kΩ Resistor', 
          spec: '1/4W Metal Film', 
          purpose: 'Pull-up resistor for DS18B20 1-Wire signal line.', 
          cost: '$0.10',
          amazonSearch: '4.7k ohm resistor 1/4w metal film'
        },
        { 
          name: 'Mean Well HDR-15-5 PSU (or equivalent)', 
          spec: 'DIN-Rail 100-240VAC to 5VDC 2.4A', 
          purpose: 'Step-down power to drive ESP32 and transceiver directly from household grid or battery bank (via buck).', 
          cost: '$12.00',
          amazonSearch: 'Mean Well HDR-15-5 5v power supply'
        },
      ];
    } else {
      return [
        { 
          name: 'ESP32-S3 Development Board', 
          spec: 'Dual-core 240MHz, 4MB Flash, Wi-Fi & BLE', 
          purpose: 'Core processor, runs ADC sampling, thermistor math, and web API.', 
          cost: '$6.00',
          amazonSearch: 'ESP32-S3 development board Type-C'
        },
        { 
          name: 'ACS758 (or ACS712) Current Sensor', 
          spec: 'Hall-effect current shunt, bidirectional, 50A/100A options', 
          purpose: 'Measures high-current DC output from the array before inverter input.', 
          cost: '$8.50',
          amazonSearch: 'ACS758 current sensor module'
        },
        { 
          name: 'Voltage Divider Network (Custom/Module)', 
          spec: '100kΩ / 10kΩ metal film precision resistors (0.1% tolerance)', 
          purpose: 'Steps down high solar DC voltage (e.g. 0-150V) to a safe 0-3.3V range for the ESP32 ADC.', 
          cost: '$1.00',
          amazonSearch: 'metal film precision resistors 100k 10k 0.1%'
        },
        { 
          name: 'SCT-013-000 Non-Invasive CT Sensor', 
          spec: '100A/50mA split-core AC Current Transformer', 
          purpose: 'Clamped around the inverter output AC live line to calculate output amps safely.', 
          cost: '$9.00',
          amazonSearch: 'SCT-013-000 split core current transformer'
        },
        { 
          name: 'ZMPT101B AC Voltage Sensor Module', 
          spec: 'Active single-phase AC voltage transformer', 
          purpose: 'Samples live utility line voltage safely for AC output wattage calculation.', 
          cost: '$4.50',
          amazonSearch: 'ZMPT101B AC voltage sensor module'
        },
        { 
          name: 'DS18B20 Waterproof Temp Probe', 
          spec: '1-Wire interface, stainless steel cap', 
          purpose: 'Clamps directly to PV backsheet to measure cell surface temperature.', 
          cost: '$3.50',
          amazonSearch: 'DS18B20 waterproof temperature sensor probe'
        },
        { 
          name: 'ADS1115 External ADC (Recommended)', 
          spec: '16-bit high-resolution I2C ADC with programmable gain PGA', 
          purpose: 'Provides accurate, linear readings of DC voltage and Hall-effect sensors (bypasses noisy ESP32 ADC).', 
          cost: '$4.00',
          amazonSearch: 'ADS1115 16-bit ADC module I2C'
        },
      ];
    }
  };

  const generateESPCode = () => {
    const wifiSetup = wifiMode === 'sta' 
      ? `// STA (Station) Mode Configuration
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";`
      : `// AP (Access Point) Mode Configuration
const char* ap_ssid = "Sunny-Side-Up-Core-Gateway";
const char* ap_password = "sunny_side_up_secure_123";
IPAddress local_ip(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);`;

    const wifiInit = wifiMode === 'sta'
      ? `  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());`
      : `  Serial.println("Configuring Access Point...");
  WiFi.softAPConfig(local_ip, gateway, subnet);
  WiFi.softAP(ap_ssid, ap_password);
  Serial.print("Access Point Ready! SSID: ");
  Serial.println(ap_ssid);
  Serial.print("Access Point IP: ");
  Serial.println(WiFi.softAPIP());`;

    if (selectedScenario === 'modbus') {
      return `/*
  ================================================================================
  SUNNY SIDE UP CORE TELEMETRY FIRMWARE (ESP32-S3)
  Scenario A: Modbus RTU (RS485 Master Transceiver Interface)
  ================================================================================
  Libraries Required (Install via Arduino Library Manager):
  - ModbusMaster (by Doc Walker)
  - OneWire (by Paul Stoffregen)
  - DallasTemperature (by Miles Burton)
  ================================================================================
*/

#include <WiFi.h>
#include <WebServer.h>
#include <ModbusMaster.h>
#include <OneWire.h>
#include <DallasTemperature.h>

${wifiSetup}

// Web Server on standard port 80
WebServer server(80);

// Hardware Serial 2 configuration for RS485 communication
#define RXD2 16  // ESP32 RX Pin -> MAX485 RO Pin
#define TXD2 17  // ESP32 TX Pin -> MAX485 DI Pin
#define RTS  4   // MAX485 DE & RE (Driver Enable/Receiver Enable) - High=TX, Low=RX

// 1-Wire Temp Sensor Configuration
#define ONE_WIRE_BUS 15 // ESP32 Pin -> DS18B20 Signal with 4.7k Pull-up
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

// Callback pin-assertion for RTS Flow Control
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

  // Initialize Hardware Serial 2 at 9600 baud (Standard Modbus Speed for MPPTs)
  Serial2.begin(9600, SERIAL_8N1, RXD2, TXD2);

  // Initialize Dallas 1-wire
  sensors.begin();

  // Modbus node ID 1 (Standard default address)
  node.begin(1, Serial2);
  node.preTransmission(preTransmission);
  node.postTransmission(postTransmission);

${wifiInit}

  // API Route serving JSON
  server.on("/api/telemetry", HTTP_GET, handleTelemetryRoute);
  
  // CORS Fallback route
  server.on("/api/telemetry", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });

  server.begin();
  Serial.println("Telemetry HTTP Server initialized.");
}

void loop() {
  server.handleClient();
  
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate > 5000) { // Polling frequency: every 5 seconds
    pollModbusRegisters();
    readTemperature();
    lastUpdate = millis();
  }
}

void pollModbusRegisters() {
  uint8_t result;
  
  // Example for EPever Tracer or standard inverters
  // Reading Input Registers starting at 0x3100 (EPEver Array stats)
  result = node.readInputRegisters(0x3100, 8);
  
  if (result == node.ku8MBSuccess) {
    // Register 0x3100: PV Voltage (High / Low byte scaled by 100)
    pv_voltage = node.getResponseBuffer(0x00) / 100.0;
    
    // Register 0x3101: PV Current (scaled by 100)
    pv_current = node.getResponseBuffer(0x01) / 100.0;
    
    // Register 0x3102: PV Power (W) (scaled by 100)
    uint32_t power_high = node.getResponseBuffer(0x03);
    uint32_t power_low = node.getResponseBuffer(0x02);
    pv_power = ((power_high << 16) | power_low) / 100.0;
    
    Serial.println("--- MODBUS TELEMETRY UPDATE ---");
    Serial.printf("PV Voltage: %.2f V | PV Current: %.2f A | PV Power: %.2f W\\n", pv_voltage, pv_current, pv_power);
  } else {
    Serial.printf("Error reading PV registers! Code: 0x%02X\\n", result);
  }

  // Reading Grid AC Load / Inverter Output from 0x310C
  result = node.readInputRegisters(0x310C, 6);
  if (result == node.ku8MBSuccess) {
    ac_voltage = node.getResponseBuffer(0x00) / 100.0;
    ac_current = node.getResponseBuffer(0x01) / 100.0;
    
    uint32_t ac_pow_high = node.getResponseBuffer(0x03);
    uint32_t ac_pow_low = node.getResponseBuffer(0x02);
    ac_power = ((ac_pow_high << 16) | ac_pow_low) / 100.0;
    
    Serial.printf("AC Voltage: %.1f V | AC Current: %.2f A | AC Load: %.1f W\\n", ac_voltage, ac_current, ac_power);
  } else {
    Serial.printf("Error reading AC registers! Code: 0x%02X\\n", result);
  }

  // Calculate dynamic conversion efficiency
  if (pv_power > 10.0) {
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
    Serial.printf("Panel Surface Temperature: %.1f °C\\n", panel_temp);
  } else {
    Serial.println("Error: Temperature sensor disconnected!");
  }
}

void handleTelemetryRoute() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  
  String json = "{";
  json += "\\"solarVolts\\":" + String(pv_voltage, 1) + ",";
  json += "\\"solarAmps\\":" + String(pv_current, 2) + ",";
  json += "\\"solarWatts\\":" + String(pv_power, 0) + ",";
  json += "\\"inverterVolts\\":" + String(ac_voltage, 1) + ",";
  json += "\\"inverterAmps\\":" + String(ac_current, 2) + ",";
  json += "\\"inverterWatts\\":" + String(ac_power, 0) + ",";
  json += "\\"efficiency\\":" + String(conversion_efficiency, 1) + ",";
  json += "\\"lossWatts\\":" + String(pv_power > ac_power ? (pv_power - ac_power) : 0.0f, 0) + ",";
  json += "\\"panelTemp\\":" + String(panel_temp, 0) + ",";
  json += "\\"gridFreq\\":60.0,";
  json += "\\"weather\\":\\"sunny\\"";
  json += "}";
  
  server.send(200, "application/json", json);
}
`;
    } else {
      return `/*
  ================================================================================
  SUNNY SIDE UP CORE TELEMETRY FIRMWARE (ESP32-S3)
  Scenario B: Direct Analog & Non-Invasive Sensor Sampling
  ================================================================================
  Libraries Required (Install via Arduino Library Manager):
  - Adafruit ADS1X15 (For external I2C 16-bit ADC)
  - EmonLib (Energy Monitoring Library for AC Current)
  - OneWire & DallasTemperature
  ================================================================================
*/

#include <WiFi.h>
#include <WebServer.h>
#include <Wire.h>
#include <Adafruit_ADS1X15.h>
#include <OneWire.h>
#include <DallasTemperature.h>

${wifiSetup}

// Web Server
WebServer server(80);

// External 16-bit ADC for precision readings
Adafruit_ADS1115 ads;

// 1-Wire Temp Sensor Configuration
#define ONE_WIRE_BUS 15 
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// ADC Calibration Constants (Change based on your hardware tuning)
const float DC_VOLT_DIVIDER_RATIO = 50.3; // e.g. 100k + 2k voltage divider factor
const float ACS758_SENSITIVITY = 0.040;  // 40mV per Amp for 50A bi-directional
const float ACS758_VREF = 2.500;         // Midpoint voltage of Hall-effect sensor

// Telemetry Registers
float pv_voltage = 0.0;
float pv_current = 0.0;
float pv_power = 0.0;
float ac_voltage = 239.5; // Nominal default if no transformer is integrated
float ac_current = 0.0;
float ac_power = 0.0;
float panel_temp = 25.0;
float conversion_efficiency = 0.0;

void setup() {
  Serial.begin(115200);
  
  // Start I2C bus on default pins (SDA=21, SCL=22)
  Wire.begin();
  
  if (!ads.begin()) {
    Serial.println("Warning: ADS1115 ADC not found. Hardware readings will be offline!");
  } else {
    // Adjust gain for up to +/- 4.096V reading range
    ads.setGain(GAIN_ONE);
  }

  sensors.begin();

${wifiInit}

  // API route serving telemetry JSON data
  server.on("/api/telemetry", HTTP_GET, handleTelemetryRoute);
  
  // CORS fallback
  server.on("/api/telemetry", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });

  server.begin();
  Serial.println("Analog Telemetry Gateway active.");
}

void loop() {
  server.handleClient();
  
  static unsigned long lastPoll = 0;
  if (millis() - lastPoll > 4000) { // Polling frequency: 4 seconds
    readAnalogDCVoltages();
    readAnalogDCCurrent();
    readACLineTelemetry();
    readDallasTemperature();
    
    // Basic physics calculations
    pv_power = pv_voltage * pv_current;
    
    if (pv_power > 15.0) {
      conversion_efficiency = (ac_power / pv_power) * 100.0;
      if (conversion_efficiency > 100.0) conversion_efficiency = 100.0;
    } else {
      conversion_efficiency = 0.0;
    }
    
    lastPoll = millis();
  }
}

void readAnalogDCVoltages() {
  // Read from ADS1115 Channel 0 (connected to PV Voltage Divider Output)
  int16_t adc0 = ads.readADC_SingleEnded(0);
  float voltageAtPin = ads.computeVolts(adc0);
  
  // Scale back to original PV Voltage
  pv_voltage = voltageAtPin * DC_VOLT_DIVIDER_RATIO;
  
  Serial.println("--- SENSOR TELEMETRY SCRAPE ---");
  Serial.printf("PV Raw DC Volt Pin: %.3fV | Scaled DC Bus: %.1fV\\n", voltageAtPin, pv_voltage);
}

void readAnalogDCCurrent() {
  // Read from ADS1115 Channel 1 (connected to ACS758 current sensor)
  int16_t adc1 = ads.readADC_SingleEnded(1);
  float sensorVolt = ads.computeVolts(adc1);
  
  // Convert voltage signal back into current
  pv_current = fabs((sensorVolt - ACS758_VREF) / ACS758_SENSITIVITY);
  
  if (pv_current < 0.15) pv_current = 0.0; // Filter noise threshold
  Serial.printf("DC Current Sensor Pin: %.3fV | Solved Amps: %.2fA\\n", sensorVolt, pv_current);
}

void readACLineTelemetry() {
  // Read from ADS1115 Channel 2 (ZMPT101B AC voltage transformer module)
  // Simple RMS sampling loop for AC metrics over 20ms full sine period
  unsigned long start_time = millis();
  float max_voltage = 0;
  
  while (millis() - start_time < 20) {
    int16_t sample = ads.readADC_SingleEnded(2);
    float val = ads.computeVolts(sample);
    if (val > max_voltage) {
      max_voltage = val;
    }
  }
  
  // Simple calibration mapping peak AC voltage signal to line voltage
  float peak_sig = fabs(max_voltage - 1.65); // assume 1.65V offset bias
  ac_voltage = peak_sig * 170.0; // calibrate transformer factor to 120/240V
  if (ac_voltage < 40.0) ac_voltage = 0.0; // offline check

  // Read from ADS1115 Channel 3 (SCT-013 CT current sensor)
  // RMS measurement loop
  float current_sum = 0;
  int sample_count = 0;
  unsigned long rms_start = millis();
  
  while (millis() - rms_start < 40) { // 2 full waves at 50/60Hz
    int16_t sample = ads.readADC_SingleEnded(3);
    float val = ads.computeVolts(sample) - 1.65; // strip mid-rail offset
    current_sum += (val * val);
    sample_count++;
  }
  
  float rms_signal_volts = sqrt(current_sum / sample_count);
  ac_current = rms_signal_volts * 30.0; // calibrate 1V RMS = 30 Amps AC load
  if (ac_current < 0.1) ac_current = 0.0;
  
  ac_power = ac_voltage * ac_current * 0.95; // 0.95 Power Factor correction
  Serial.printf("AC Active: %.1fV | AC Amps: %.2fA | AC Load: %.1fW\\n", ac_voltage, ac_current, ac_power);
}

void readDallasTemperature() {
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);
  if (tempC != DEVICE_DISCONNECTED_C) {
    panel_temp = tempC;
  }
}

void handleTelemetryRoute() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  
  String json = "{";
  json += "\\"solarVolts\\":" + String(pv_voltage, 1) + ",";
  json += "\\"solarAmps\\":" + String(pv_current, 2) + ",";
  json += "\\"solarWatts\\":" + String(pv_power, 0) + ",";
  json += "\\"inverterVolts\\":" + String(ac_voltage, 1) + ",";
  json += "\\"inverterAmps\\":" + String(ac_current, 2) + ",";
  json += "\\"inverterWatts\\":" + String(ac_power, 0) + ",";
  json += "\\"efficiency\\":" + String(conversion_efficiency, 1) + ",";
  json += "\\"lossWatts\\":" + String(pv_power > ac_power ? (pv_power - ac_power) : 0.0f, 0) + ",";
  json += "\\"panelTemp\\":" + String(panel_temp, 0) + ",";
  json += "\\"gridFreq\\":60.0,";
  json += "\\"weather\\":\\"cloudy\\"";
  json += "}";
  
  server.send(200, "application/json", json);
}
`;
    }
  };

  return (
    <div className="bg-[#111318] border border-slate-800 p-6 font-mono text-xs text-slate-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-6 border-b border-slate-800/80">
        <div>
          <h2 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-1.5">
            <Cpu size={16} className="text-yellow-500" />
            ESP32 IoT TELEMETRY FIRMWARE & DIAGNOSTICS
          </h2>
          <p className="text-[10px] text-slate-500 uppercase mt-0.5">Configure hardware specifications, view wiring schematics, and simulate system connectivity checks</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSelectedScenario('modbus');
              setSelectedWire(null);
              setVerificationState('idle');
              setVerificationLogs([]);
            }}
            className={`px-3 py-1.5 text-[9px] font-bold border transition-all uppercase flex items-center gap-1 cursor-pointer ${selectedScenario === 'modbus' ? 'bg-yellow-500 text-slate-950 border-yellow-500' : 'bg-[#1A1C20] text-slate-400 border-slate-800 hover:text-white'}`}
          >
            <Layers size={11} />
            MODBUS RTU (RS485)
          </button>
          <button
            onClick={() => {
              setSelectedScenario('analog');
              setSelectedWire(null);
              setVerificationState('idle');
              setVerificationLogs([]);
            }}
            className={`px-3 py-1.5 text-[9px] font-bold border transition-all uppercase flex items-center gap-1 cursor-pointer ${selectedScenario === 'analog' ? 'bg-yellow-500 text-slate-950 border-yellow-500' : 'bg-[#1A1C20] text-slate-400 border-slate-800 hover:text-white'}`}
          >
            <HardDrive size={11} />
            DIRECT ANALOG / SHUNT
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Hardware BOM and Settings column */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-[#1A1C20] border border-slate-800 p-4 space-y-4">
            <h3 className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
              <Settings size={12} className="text-yellow-500" />
              1. IoT Networking Options
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setWifiMode('sta')}
                className={`p-2 border font-bold text-[9px] transition-all uppercase flex flex-col items-center gap-1.5 cursor-pointer ${wifiMode === 'sta' ? 'bg-slate-800 text-yellow-500 border-yellow-500/50' : 'bg-[#111318] text-slate-500 border-slate-800/60 hover:text-slate-300'}`}
              >
                <Wifi size={14} />
                CONNECT TO WIFI (STA)
              </button>
              <button
                onClick={() => setWifiMode('ap')}
                className={`p-2 border font-bold text-[9px] transition-all uppercase flex flex-col items-center gap-1.5 cursor-pointer ${wifiMode === 'ap' ? 'bg-slate-800 text-yellow-500 border-yellow-500/50' : 'bg-[#111318] text-slate-500 border-slate-800/60 hover:text-slate-300'}`}
              >
                <Terminal size={14} />
                CREATE HOST AP
              </button>
            </div>
            <p className="text-[9px] text-slate-500 uppercase leading-normal font-sans">
              {wifiMode === 'sta' 
                ? 'Firmware connects to your local home Wi-Fi network. Recommended when mapping standard home automation databases or central dashboards.' 
                : 'Firmware spins up a standalone "Sunny-Side-Up-Core-Gateway" hotspot (IP: 192.168.4.1) for isolated off-grid deployments.'}
            </p>
          </div>

          <div className="bg-[#1A1C20] border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
              <h3 className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                <List size={12} className="text-yellow-500" />
                2. Required Hardware Components
              </h3>
              <span className="text-[8px] text-slate-500 font-bold font-mono">BOM INDEX</span>
            </div>
            <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1">
              {getBOM().map((item, idx) => (
                <div key={idx} className="border-b border-slate-800/40 pb-2.5 last:border-b-0 last:pb-0 flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                     <span className="font-bold text-slate-200 text-[10px] uppercase">{item.name}</span>
                     <span className="text-emerald-400 font-bold text-[9px]">{item.cost}</span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-sans font-medium">{item.spec}</div>
                  <div className="text-[9px] text-slate-500 italic font-sans">{item.purpose}</div>
                  <div className="flex items-center justify-between gap-1.5 mt-0.5 pt-1 border-t border-slate-800/20">
                    <span className="text-[8px] font-mono text-slate-500 uppercase truncate max-w-[150px] sm:max-w-[200px]">
                      Key: <span className="text-slate-400">"{item.amazonSearch}"</span>
                    </span>
                    <a
                      href={`https://www.amazon.com/s?k=${encodeURIComponent(item.amazonSearch)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[8px] font-bold text-yellow-500 hover:text-yellow-400 border border-yellow-500/20 hover:border-yellow-400/40 px-1.5 py-0.5 rounded transition-all cursor-pointer bg-yellow-500/5 hover:bg-yellow-500/10"
                    >
                      <Search size={8} />
                      AMAZON
                      <ExternalLink size={7} />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Dual Tab Column */}
        <div className="lg:col-span-7 flex flex-col bg-[#1A1C20] border border-slate-800">
          <div className="flex items-center justify-between bg-[#111318] border-b border-slate-800 px-4 py-2">
            <div className="flex gap-2">
              <button
                onClick={() => setRightTab('diagram')}
                className={`px-3 py-1.5 text-[9px] font-bold border transition-all uppercase flex items-center gap-1.5 cursor-pointer ${rightTab === 'diagram' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' : 'text-slate-400 hover:text-white border-transparent'}`}
              >
                <Layers size={11} />
                WIRING SCHEMATIC
              </button>
              <button
                onClick={() => setRightTab('code')}
                className={`px-3 py-1.5 text-[9px] font-bold border transition-all uppercase flex items-center gap-1.5 cursor-pointer ${rightTab === 'code' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' : 'text-slate-400 hover:text-white border-transparent'}`}
              >
                <Terminal size={11} />
                C++ SOURCE CODE
              </button>
            </div>
            {rightTab === 'code' && (
              <button
                onClick={() => handleCopy(generateESPCode())}
                className="text-[9px] font-bold border border-slate-800 bg-[#1A1C20] hover:bg-slate-800 px-2.5 py-1 text-slate-300 transition-all flex items-center gap-1 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check size={10} className="text-emerald-400" />
                    COPIED!
                  </>
                ) : (
                  <>
                    <Copy size={10} />
                    COPY CODE
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex-1 p-4 flex flex-col justify-between">
            {rightTab === 'code' ? (
              <div className="flex-1 h-[480px] overflow-auto font-mono text-[10px] text-slate-400 leading-normal select-text">
                <pre className="whitespace-pre">{generateESPCode()}</pre>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Visual SVG Diagram */}
                <div className="relative">
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 px-2 py-1 border border-slate-800/80 rounded backdrop-blur">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-ping"></span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Interactive Pinouts</span>
                  </div>
                  
                  <svg viewBox="0 0 800 480" className="w-full h-auto bg-[#0A0B0D] border border-slate-800 rounded p-2 select-none">
                    <defs>
                      <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="4" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Scenario A: Modbus RTU Schematic */}
                    {selectedScenario === 'modbus' ? (
                      <>
                        {/* ESP32-S3 block */}
                        <rect x="40" y="40" width="160" height="400" rx="6" fill="#1E293B" stroke="#475569" strokeWidth="2" />
                        <rect x="50" y="50" width="140" height="30" rx="4" fill="#0F172A" />
                        <text x="120" y="70" fill="#E2E8F0" fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="1">ESP32-S3 CORE</text>
                        
                        {/* ESP32 pin headers */}
                        {/* GND */}
                        <circle cx="200" cy="110" r="4" fill="#EAB308" />
                        <text x="190" y="114" fill="#94A3B8" fontSize="8" textAnchor="end">GND [Pin 1]</text>
                        {/* 5V */}
                        <circle cx="200" cy="150" r="4" fill="#EAB308" />
                        <text x="190" y="154" fill="#94A3B8" fontSize="8" textAnchor="end">5V (VIN)</text>
                        {/* 3V3 */}
                        <circle cx="200" cy="190" r="4" fill="#EAB308" />
                        <text x="190" y="194" fill="#94A3B8" fontSize="8" textAnchor="end">3.3V OUT</text>
                        {/* GPIO4 */}
                        <circle cx="200" cy="240" r="4" fill="#EAB308" />
                        <text x="190" y="244" fill="#F8FAFC" fontSize="8" fontWeight="bold" textAnchor="end">GPIO4 (RTS)</text>
                        {/* GPIO15 */}
                        <circle cx="200" cy="290" r="4" fill="#EAB308" />
                        <text x="190" y="294" fill="#F8FAFC" fontSize="8" fontWeight="bold" textAnchor="end">GPIO15 (TEMP)</text>
                        {/* GPIO16 */}
                        <circle cx="200" cy="340" r="4" fill="#EAB308" />
                        <text x="190" y="344" fill="#F8FAFC" fontSize="8" fontWeight="bold" textAnchor="end">GPIO16 (RX2)</text>
                        {/* GPIO17 */}
                        <circle cx="200" cy="390" r="4" fill="#EAB308" />
                        <text x="190" y="394" fill="#F8FAFC" fontSize="8" fontWeight="bold" textAnchor="end">GPIO17 (TX2)</text>

                        {/* MAX485 TTL to RS485 module */}
                        <rect x="330" y="160" width="140" height="260" rx="4" fill="#0F172A" stroke="#3B82F6" strokeWidth="2" />
                        <text x="400" y="185" fill="#3B82F6" fontSize="10" fontWeight="bold" textAnchor="middle">MAX485 MODULE</text>
                        
                        {/* MAX485 inputs */}
                        <circle cx="330" cy="210" r="4" fill="#38BDF8" />
                        <text x="340" y="214" fill="#94A3B8" fontSize="8">VCC</text>
                        <circle cx="330" cy="250" r="4" fill="#38BDF8" />
                        <text x="340" y="254" fill="#94A3B8" fontSize="8">GND</text>
                        <circle cx="330" cy="300" r="4" fill="#38BDF8" />
                        <text x="340" y="304" fill="#F8FAFC" fontSize="8">RE & DE</text>
                        <circle cx="330" cy="350" r="4" fill="#38BDF8" />
                        <text x="340" y="354" fill="#F8FAFC" fontSize="8">DI (TX)</text>
                        <circle cx="330" cy="390" r="4" fill="#38BDF8" />
                        <text x="340" y="394" fill="#F8FAFC" fontSize="8">RO (RX)</text>

                        {/* MAX485 Outputs */}
                        <circle cx="470" cy="250" r="5" fill="#F97316" />
                        <text x="460" y="254" fill="#F8FAFC" fontSize="8" textAnchor="end">A (+)</text>
                        <circle cx="470" cy="330" r="5" fill="#EAB308" />
                        <text x="460" y="334" fill="#F8FAFC" fontSize="8" textAnchor="end">B (-)</text>

                        {/* DS18B20 Temp Probe */}
                        <rect x="580" y="40" width="180" height="110" rx="4" fill="#334155" stroke="#64748B" strokeWidth="1.5" />
                        <text x="670" y="65" fill="#F8FAFC" fontSize="9" fontWeight="bold" textAnchor="middle">DS18B20 TEMP PROBE</text>
                        
                        <rect x="590" y="80" width="45" height="15" fill="#EF4444" rx="2" />
                        <text x="612" y="91" fill="white" fontSize="7" fontWeight="bold" textAnchor="middle">VCC (RED)</text>
                        <rect x="590" y="105" width="45" height="15" fill="#1E293B" rx="2" />
                        <text x="612" y="116" fill="white" fontSize="7" fontWeight="bold" textAnchor="middle">GND (BLK)</text>
                        <rect x="590" y="130" width="45" height="15" fill="#EAB308" rx="2" />
                        <text x="612" y="141" fill="#0F172A" fontSize="7" fontWeight="bold" textAnchor="middle">DQ (YLW)</text>

                        {/* Inverter Block */}
                        <rect x="580" y="200" width="180" height="210" rx="4" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5" />
                        <text x="670" y="225" fill="#F59E0B" fontSize="9" fontWeight="bold" textAnchor="middle">SMART INVERTER RS485</text>
                        
                        <rect x="590" y="245" width="60" height="20" fill="#111318" stroke="#334155" />
                        <text x="620" y="258" fill="#E2E8F0" fontSize="8" textAnchor="middle">A (+) PIN 5</text>
                        
                        <rect x="590" y="305" width="60" height="20" fill="#111318" stroke="#334155" />
                        <text x="620" y="318" fill="#E2E8F0" fontSize="8" textAnchor="middle">B (-) PIN 6</text>

                        <rect x="590" y="365" width="60" height="20" fill="#111318" stroke="#334155" />
                        <text x="620" y="378" fill="#E2E8F0" fontSize="8" textAnchor="middle">GND PIN 7</text>

                        {/* --- WIRE PATHWAYS --- */}
                        {/* 5V Link */}
                        <path
                          d="M 200,150 H 260 V 210 H 330"
                          fill="none"
                          stroke={selectedWire === 'modbus-5v' ? '#EF4444' : '#991B1B'}
                          strokeWidth={selectedWire === 'modbus-5v' ? 4 : 2}
                          filter={selectedWire === 'modbus-5v' ? 'url(#glow-filter)' : undefined}
                          className="transition-all cursor-pointer"
                          onClick={() => setSelectedWire('modbus-5v')}
                        />
                        {/* GND Link */}
                        <path
                          d="M 200,110 H 240 V 250 H 330 M 330,250 H 490 V 375 H 590"
                          fill="none"
                          stroke={selectedWire === 'modbus-gnd' ? '#E2E8F0' : '#475569'}
                          strokeWidth={selectedWire === 'modbus-gnd' ? 4 : 2}
                          filter={selectedWire === 'modbus-gnd' ? 'url(#glow-filter)' : undefined}
                          className="transition-all cursor-pointer"
                          onClick={() => setSelectedWire('modbus-gnd')}
                        />
                        {/* RTS Line */}
                        <path
                          d="M 200,240 H 280 V 300 H 330"
                          fill="none"
                          stroke={selectedWire === 'modbus-rts' ? '#3B82F6' : '#1D4ED8'}
                          strokeWidth={selectedWire === 'modbus-rts' ? 4 : 2}
                          filter={selectedWire === 'modbus-rts' ? 'url(#glow-filter)' : undefined}
                          className="transition-all cursor-pointer"
                          onClick={() => setSelectedWire('modbus-rts')}
                        />
                        {/* TX Line */}
                        <path
                          d="M 200,390 H 290 V 350 H 330"
                          fill="none"
                          stroke={selectedWire === 'modbus-tx' ? '#10B981' : '#047857'}
                          strokeWidth={selectedWire === 'modbus-tx' ? 4 : 2}
                          filter={selectedWire === 'modbus-tx' ? 'url(#glow-filter)' : undefined}
                          className="transition-all cursor-pointer"
                          onClick={() => setSelectedWire('modbus-tx')}
                        />
                        {/* RX Line */}
                        <path
                          d="M 200,340 H 270 V 390 H 330"
                          fill="none"
                          stroke={selectedWire === 'modbus-rx' ? '#A855F7' : '#6B21A8'}
                          strokeWidth={selectedWire === 'modbus-rx' ? 4 : 2}
                          filter={selectedWire === 'modbus-rx' ? 'url(#glow-filter)' : undefined}
                          className="transition-all cursor-pointer"
                          onClick={() => setSelectedWire('modbus-rx')}
                        />
                        {/* RS485 A */}
                        <path
                          d="M 470,250 H 510 V 255 H 590"
                          fill="none"
                          stroke={selectedWire === 'modbus-rs485a' ? '#F97316' : '#C2410C'}
                          strokeWidth={selectedWire === 'modbus-rs485a' ? 4 : 2}
                          filter={selectedWire === 'modbus-rs485a' ? 'url(#glow-filter)' : undefined}
                          className="transition-all cursor-pointer"
                          onClick={() => setSelectedWire('modbus-rs485a')}
                        />
                        {/* RS485 B */}
                        <path
                          d="M 470,330 H 510 V 315 H 590"
                          fill="none"
                          stroke={selectedWire === 'modbus-rs485b' ? '#EAB308' : '#A16207'}
                          strokeWidth={selectedWire === 'modbus-rs485b' ? 4 : 2}
                          filter={selectedWire === 'modbus-rs485b' ? 'url(#glow-filter)' : undefined}
                          className="transition-all cursor-pointer"
                          onClick={() => setSelectedWire('modbus-rs485b')}
                        />
                        {/* DS18B20 VCC */}
                        <path d="M 200,190 H 220 V 130 H 490 V 88 H 590" fill="none" stroke="#EF4444" strokeWidth="1" strokeDasharray="2,2" />
                        {/* DS18B20 Temp Line */}
                        <path
                          d="M 200,290 H 250 V 170 H 520 V 138 H 590"
                          fill="none"
                          stroke={selectedWire === 'modbus-temp' ? '#14B8A6' : '#0F766E'}
                          strokeWidth={selectedWire === 'modbus-temp' ? 4 : 2}
                          filter={selectedWire === 'modbus-temp' ? 'url(#glow-filter)' : undefined}
                          className="transition-all cursor-pointer"
                          onClick={() => setSelectedWire('modbus-temp')}
                        />
                      </>
                    ) : (
                      <>
                        {/* Scenario B: Direct Analog & Non-Invasive Schematic */}
                        {/* ESP32-S3 block */}
                        <rect x="40" y="40" width="150" height="400" rx="6" fill="#1E293B" stroke="#475569" strokeWidth="2" />
                        <rect x="50" y="50" width="130" height="30" rx="4" fill="#0F172A" />
                        <text x="115" y="70" fill="#E2E8F0" fontSize="10" fontWeight="bold" textAnchor="middle" letterSpacing="1">ESP32-S3 CORE</text>

                        {/* ESP32 Analog Pins */}
                        <circle cx="190" cy="100" r="4" fill="#EAB308" />
                        <text x="180" y="104" fill="#94A3B8" fontSize="8" textAnchor="end">GND</text>
                        <circle cx="190" cy="140" r="4" fill="#EAB308" />
                        <text x="180" y="144" fill="#94A3B8" fontSize="8" textAnchor="end">5V OUT</text>
                        <circle cx="190" cy="180" r="4" fill="#EAB308" />
                        <text x="180" y="184" fill="#94A3B8" fontSize="8" textAnchor="end">3.3V OUT</text>
                        <circle cx="190" cy="230" r="4" fill="#EAB308" />
                        <text x="180" y="234" fill="#F8FAFC" fontSize="8" fontWeight="bold" textAnchor="end">GPIO15 (TEMP)</text>
                        <circle cx="190" cy="300" r="4" fill="#EAB308" />
                        <text x="180" y="304" fill="#F8FAFC" fontSize="8" fontWeight="bold" textAnchor="end">GPIO21 (SDA)</text>
                        <circle cx="190" cy="360" r="4" fill="#EAB308" />
                        <text x="180" y="364" fill="#F8FAFC" fontSize="8" fontWeight="bold" textAnchor="end">GPIO22 (SCL)</text>

                        {/* ADS1115 external ADC */}
                        <rect x="290" y="80" width="160" height="330" rx="4" fill="#0F172A" stroke="#3B82F6" strokeWidth="2" />
                        <text x="370" y="105" fill="#3B82F6" fontSize="10" fontWeight="bold" textAnchor="middle">ADS1115 16-BIT ADC</text>

                        {/* Left edge (I2C) */}
                        <circle cx="290" cy="130" r="4" fill="#38BDF8" />
                        <text x="300" y="134" fill="#94A3B8" fontSize="8">VDD</text>
                        <circle cx="290" cy="160" r="4" fill="#38BDF8" />
                        <text x="300" y="164" fill="#94A3B8" fontSize="8">GND</text>
                        <circle cx="290" cy="200" r="4" fill="#38BDF8" />
                        <text x="300" y="204" fill="#F8FAFC" fontSize="8">SCL</text>
                        <circle cx="290" cy="240" r="4" fill="#38BDF8" />
                        <text x="300" y="244" fill="#F8FAFC" fontSize="8">SDA</text>

                        {/* Right edge (Analog Channels) */}
                        <circle cx="450" cy="150" r="4" fill="#A855F7" />
                        <text x="440" y="154" fill="#F8FAFC" fontSize="8" textAnchor="end">A0 (PV VOLT)</text>
                        <circle cx="450" cy="220" r="4" fill="#A855F7" />
                        <text x="440" y="224" fill="#F8FAFC" fontSize="8" textAnchor="end">A1 (PV CURR)</text>
                        <circle cx="450" cy="290" r="4" fill="#A855F7" />
                        <text x="440" y="294" fill="#F8FAFC" fontSize="8" textAnchor="end">A2 (AC VOLT)</text>
                        <circle cx="450" cy="360" r="4" fill="#A855F7" />
                        <text x="440" y="364" fill="#F8FAFC" fontSize="8" textAnchor="end">A3 (AC CURR)</text>

                        {/* Sensor block array on right */}
                        {/* PV Divider */}
                        <rect x="580" y="40" width="180" height="70" rx="4" fill="#1E293B" stroke="#8B5CF6" strokeWidth="1.5" />
                        <text x="670" y="58" fill="#C084FC" fontSize="8" fontWeight="bold" textAnchor="middle">PV DC VOLTAGE DIVIDER</text>
                        <text x="670" y="72" fill="#94A3B8" fontSize="7" textAnchor="middle">100kΩ / 10kΩ Steps (150V Max)</text>
                        <circle cx="580" cy="90" r="4" fill="#8B5CF6" />
                        <text x="590" y="94" fill="#F8FAFC" fontSize="7">OUT (0-3.3V)</text>

                        {/* ACS758 Current Sensor */}
                        <rect x="580" y="125" width="180" height="70" rx="4" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5" />
                        <text x="670" y="143" fill="#FBBF24" fontSize="8" fontWeight="bold" textAnchor="middle">ACS758 DC CURRENT SHUNT</text>
                        <text x="670" y="157" fill="#94A3B8" fontSize="7" textAnchor="middle">Hall-Effect Bidirectional</text>
                        <circle cx="580" cy="175" r="4" fill="#F59E0B" />
                        <text x="590" y="179" fill="#F8FAFC" fontSize="7">OUT (40mV/A)</text>

                        {/* ZMPT101B AC Transformer */}
                        <rect x="580" y="210" width="180" height="70" rx="4" fill="#1E293B" stroke="#F97316" strokeWidth="1.5" />
                        <text x="670" y="228" fill="#FB923C" fontSize="8" fontWeight="bold" textAnchor="middle">ZMPT101B AC VOLTAGE</text>
                        <text x="670" y="242" fill="#94A3B8" fontSize="7" textAnchor="middle">Optically Isolated 120V/240V</text>
                        <circle cx="580" cy="260" r="4" fill="#F97316" />
                        <text x="590" y="264" fill="#F8FAFC" fontSize="7">OUT (Sine wave)</text>

                        {/* SCT-013 AC current clamp */}
                        <rect x="580" y="295" width="180" height="70" rx="4" fill="#1E293B" stroke="#14B8A6" strokeWidth="1.5" />
                        <text x="670" y="313" fill="#2DD4BF" fontSize="8" fontWeight="bold" textAnchor="middle">SCT-013 AC CURRENT CT</text>
                        <text x="670" y="327" fill="#94A3B8" fontSize="7" textAnchor="middle">Non-Invasive Split-Core Clamp</text>
                        <circle cx="580" cy="345" r="4" fill="#14B8A6" />
                        <text x="590" y="349" fill="#F8FAFC" fontSize="7">OUT (Current wave)</text>

                        {/* DS18B20 temp */}
                        <rect x="580" y="380" width="180" height="75" rx="4" fill="#334155" stroke="#64748B" strokeWidth="1.5" />
                        <text x="670" y="398" fill="#E2E8F0" fontSize="8" fontWeight="bold" textAnchor="middle">DS18B20 TEMPERATURE</text>
                        <circle cx="580" cy="425" r="4" fill="#14B8A6" />
                        <text x="590" y="429" fill="#F8FAFC" fontSize="7">DQ LINE</text>

                        {/* --- WIRE PATHWAYS FOR ANALOG --- */}
                        {/* 3.3V Logic Bus */}
                        <path
                          d="M 190,180 H 230 V 130 H 290"
                          fill="none"
                          stroke={selectedWire === 'analog-3v3' ? '#EF4444' : '#991B1B'}
                          strokeWidth={selectedWire === 'analog-3v3' ? 4 : 2}
                          filter={selectedWire === 'analog-3v3' ? 'url(#glow-filter)' : undefined}
                          className="transition-all cursor-pointer"
                          onClick={() => setSelectedWire('analog-3v3')}
                        />
                        {/* GND Bus */}
                        <path
                          d="M 190,100 H 220 V 160 H 290"
                          fill="none"
                          stroke={selectedWire === 'analog-gnd' ? '#E2E8F0' : '#475569'}
                          strokeWidth={selectedWire === 'analog-gnd' ? 4 : 2}
                          filter={selectedWire === 'analog-gnd' ? 'url(#glow-filter)' : undefined}
                          className="transition-all cursor-pointer"
                          onClick={() => setSelectedWire('analog-gnd')}
                        />
                        {/* SDA */}
                        <path
                          d="M 190,300 H 250 V 240 H 290"
                          fill="none"
                          stroke={selectedWire === 'analog-sda' ? '#10B981' : '#047857'}
                          strokeWidth={selectedWire === 'analog-sda' ? 4 : 2}
                          filter={selectedWire === 'analog-sda' ? 'url(#glow-filter)' : undefined}
                          className="transition-all cursor-pointer"
                          onClick={() => setSelectedWire('analog-sda')}
                        />
                        {/* SCL */}
                        <path
                          d="M 190,360 H 260 V 200 H 290"
                          fill="none"
                          stroke={selectedWire === 'analog-scl' ? '#3B82F6' : '#1D4ED8'}
                          strokeWidth={selectedWire === 'analog-scl' ? 4 : 2}
                          filter={selectedWire === 'analog-scl' ? 'url(#glow-filter)' : undefined}
                          className="transition-all cursor-pointer"
                          onClick={() => setSelectedWire('analog-scl')}
                        />
                        {/* A0 Signal */}
                        <path
                          d="M 580,90 H 510 V 150 H 450"
                          fill="none"
                          stroke={selectedWire === 'analog-a0' ? '#8B5CF6' : '#6B21A8'}
                          strokeWidth={selectedWire === 'analog-a0' ? 4 : 2}
                          filter={selectedWire === 'analog-a0' ? 'url(#glow-filter)' : undefined}
                          className="transition-all cursor-pointer"
                          onClick={() => setSelectedWire('analog-a0')}
                        />
                        {/* A1 Signal */}
                        <path
                          d="M 580,175 H 520 V 220 H 450"
                          fill="none"
                          stroke={selectedWire === 'analog-a1' ? '#F59E0B' : '#B45309'}
                          strokeWidth={selectedWire === 'analog-a1' ? 4 : 2}
                          filter={selectedWire === 'analog-a1' ? 'url(#glow-filter)' : undefined}
                          className="transition-all cursor-pointer"
                          onClick={() => setSelectedWire('analog-a1')}
                        />
                        {/* A2 Signal */}
                        <path
                          d="M 580,260 H 530 V 290 H 450"
                          fill="none"
                          stroke={selectedWire === 'analog-a2' ? '#F97316' : '#C2410C'}
                          strokeWidth={selectedWire === 'analog-a2' ? 4 : 2}
                          filter={selectedWire === 'analog-a2' ? 'url(#glow-filter)' : undefined}
                          className="transition-all cursor-pointer"
                          onClick={() => setSelectedWire('analog-a2')}
                        />
                        {/* A3 Signal */}
                        <path
                          d="M 580,345 H 510 V 360 H 450"
                          fill="none"
                          stroke={selectedWire === 'analog-a3' ? '#14B8A6' : '#0F766E'}
                          strokeWidth={selectedWire === 'analog-a3' ? 4 : 2}
                          filter={selectedWire === 'analog-a3' ? 'url(#glow-filter)' : undefined}
                          className="transition-all cursor-pointer"
                          onClick={() => setSelectedWire('analog-a3')}
                        />
                        {/* Temp direct probe lines */}
                        <path d="M 190,230 H 220 V 425 H 580" fill="none" stroke="#22D3EE" strokeWidth="1.5" strokeDasharray="3,3" />
                      </>
                    )}
                  </svg>
                </div>

                {/* Wire detail panel */}
                <div className="bg-[#111318] border border-slate-800 p-3 rounded">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800/60">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
                      <Info size={12} className="text-yellow-500" />
                      {selectedWire ? "Wire Calibration Details" : "Inter-Module Bus Selection"}
                    </span>
                    <span className="text-[8px] text-slate-500 font-bold font-mono">SPECIFICATION GATEWAY</span>
                  </div>

                  {selectedWire && wireDetails[selectedWire] ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-white uppercase flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full inline-block border border-slate-700" style={{ backgroundColor: wireDetails[selectedWire].color }}></span>
                          {wireDetails[selectedWire].name}
                        </span>
                        <div className="flex gap-1.5">
                          <span className="text-[8px] bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 px-1.5 py-0.5 font-bold uppercase tracking-wider rounded">
                            {wireDetails[selectedWire].gauge}
                          </span>
                          <span className="text-[8px] bg-slate-800 border border-slate-700 text-slate-400 px-1.5 py-0.5 font-bold uppercase tracking-wider rounded">
                            {wireDetails[selectedWire].type}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <div className="text-[8px] text-slate-500 uppercase tracking-widest font-bold font-sans">Physical Connection</div>
                          <div className="text-[10px] text-slate-300 leading-normal font-sans font-medium">{wireDetails[selectedWire].connection}</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[8px] text-slate-500 uppercase tracking-widest font-bold font-sans">Functional Purpose</div>
                          <div className="text-[10px] text-slate-300 leading-normal font-sans font-medium">{wireDetails[selectedWire].purpose}</div>
                        </div>
                      </div>
                      <div className="bg-red-950/20 border border-red-900/30 p-2 text-[9px] text-red-300 font-sans leading-normal flex items-start gap-1.5">
                        <AlertCircle size={12} className="text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-red-400 font-bold uppercase">Safety / Deployment Advice: </strong>
                          {wireDetails[selectedWire].safety}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-[9px] text-slate-500 italic py-3 text-center font-sans font-medium">
                      Hover over or click any of the colored pathways on the schematic above to see wire gauges, terminal connections, isolation rules, and deployment instructions.
                    </div>
                  )}
                </div>

                {/* Simulated Verification System */}
                <div className="bg-[#1A1C20] border border-slate-800 p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
                    <div>
                      <h3 className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Activity size={12} className="text-yellow-500" />
                        3. Connection Handshake Tester
                      </h3>
                      <p className="text-[8px] text-slate-500 uppercase mt-0.5">Test simulated signal transmission between ESP32 and target sensors</p>
                    </div>
                    <div>
                      {verificationState === 'idle' && (
                        <span className="text-[8px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 font-bold rounded uppercase tracking-wider">
                          Ready To Verify
                        </span>
                      )}
                      {verificationState === 'running' && (
                        <span className="text-[8px] bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 font-bold rounded uppercase tracking-wider flex items-center gap-1 animate-pulse">
                          <RefreshCw size={9} className="animate-spin" />
                          Testing Bus
                        </span>
                      )}
                      {verificationState === 'success' && (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 font-bold rounded uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 size={10} />
                          Handshake Stable
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start">
                    <div className="md:col-span-8 bg-[#0A0B0D] border border-slate-800 p-2.5 h-[120px] overflow-y-auto font-mono text-[8px] text-slate-400 leading-normal space-y-1">
                      {verificationLogs.length === 0 ? (
                        <div className="text-slate-600 italic flex items-center justify-center h-full">
                          Telemetry logs offline. Click 'Verify Connection' to trigger a simulated serial diagnostic loop.
                        </div>
                      ) : (
                        verificationLogs.map((log, index) => (
                          <div
                            key={index}
                            className={`flex items-start gap-1 font-mono ${
                              log.includes('[SUCCESS]') ? 'text-emerald-400' :
                              log.includes('[INFO]') ? 'text-blue-400' :
                              log.includes('->') ? 'text-yellow-500/90 pl-3' : 'text-slate-300'
                            }`}
                          >
                            <span className="text-slate-600 select-none">[{index + 1}]</span>
                            <span>{log}</span>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="md:col-span-4 h-full flex flex-col justify-between gap-2.5">
                      <div className="bg-[#111318] p-2 border border-slate-800 rounded">
                        <div className="text-[7px] text-slate-500 font-bold uppercase tracking-widest font-sans">Bus Baud Rate</div>
                        <div className="text-[11px] font-bold text-white uppercase font-mono mt-0.5">
                          {selectedScenario === 'modbus' ? '9600 BAUD (8N1)' : '400 KHz (I2C)'}
                        </div>
                      </div>

                      <button
                        onClick={runDiagnosticCheck}
                        disabled={verificationState === 'running'}
                        className={`w-full py-2.5 px-3 text-[9px] font-mono font-bold uppercase flex items-center justify-center gap-1.5 transition-all rounded ${
                          verificationState === 'running'
                            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            : 'bg-emerald-500 text-slate-950 border border-emerald-600 hover:bg-emerald-400 cursor-pointer'
                        }`}
                      >
                        <Play size={10} />
                        VERIFY CONNECTION
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
