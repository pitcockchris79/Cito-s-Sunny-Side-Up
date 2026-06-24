<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy

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
