---
title: Network Energy Usage
description: How the energy figure on nano.community is calculated from representatives' measured readings and hardware reports, how operators submit them, and what the figure leaves out
tags: nano, xno, energy, power, representative, sustainability, measurement, estimate
---

# Network Energy Usage

The homepage shows "Energy a day" for the Nano network, with a line beneath it such as "from 30 of 49 principal reps (2 measured, 27 estimated)". This page explains what that figure is, where each input comes from, and how a representative operator can add one.

## What is reported

The figure is the summed current power of the online principal representatives that report one, converted to a daily amount: total watts × 24 ÷ 1000 = kWh a day. It is the daily equivalent of the current rate, not energy metered over a particular day.

Each representative's power comes from the first of these it has:

1. **A signed power reading.** The operator measures the whole host over at least 24 hours with a meter and signs the result.
2. **An estimate from its own hardware.** The operator runs a command on the host that reads its CPU, memory, disks and average CPU utilization, and signs the report. The site turns that into watts with a published model, described below.
3. **A CPU TDP specification.** A few representatives have a hand-entered thermal design power value for their CPU from earlier versions of this site. It is a manufacturer's specification for the CPU alone, used only until the operator submits a reading or a hardware report.

A representative with none of these counts as not reporting. Nothing is estimated for it from averages, its hosting provider or a typical node: every estimate comes from that representative's own reported hardware. The coverage line always shows how many representatives the figure includes and how many of those are measured or estimated.

A signature proves who submitted a reading or report, not that it is accurate. Every input is public on the [representatives page](/representatives), in the Power (W) column, with its source and date. The card shows the date of the oldest input in use.

## Who counts

Only online principal representatives count. That is the same set as the principal representative count on the homepage: representatives that are online and hold at least 0.1% of the trended voting weight. That is the threshold the [Nano documentation](https://docs.nano.org/protocol-design/orv-consensus/) gives for a principal representative, whose votes other nodes rebroadcast.

The figure leaves out:

- non-principal representatives
- nodes that do not vote, such as wallet backends, exchanges and explorers
- the devices and networks of people sending transactions

It is therefore not a whole-network total. It is the energy of the voting nodes that secure the network, as far as their operators have reported it.

## The boundary

Readings and estimates both cover the host the node runs on, or for a virtual machine, that machine's share. If the host runs other workloads alongside the node, their energy is included. The hardware report also records the node process's own share of CPU, so a node-only figure can be derived later. Data-center overhead such as cooling is not included, because it is published for only a few providers.

## Measured readings

Measure the energy the host used over a window of at least 24 hours, so one full daily cycle is covered. Read a cumulative energy counter at the start and the end, and submit the difference in whole watt-hours.

- **`wall_meter`** — a plug-in or inline energy meter between the wall and the host's power supply. Use one that shows accumulated energy (kWh or Wh), not only instantaneous watts.
- **`baseboard_management_controller`** — the host's own power sensor, read through its management controller:
  - **Redfish:** the `EnergykWh` property of a chassis or system's [EnvironmentMetrics](https://redfish.dmtf.org/schemas/v1/EnvironmentMetrics.v1_3_1.json) "shall contain the total energy, in kilowatt-hour units, for this resource". A [Sensor](https://redfish.dmtf.org/schemas/v1/Sensor.v1_10_0.json) with an energy reading type gives the same. Take the difference between two readings.
  - **IPMI DCMI:** "Get Power Reading" (section 6.6.1 of the [DCMI 1.5 specification](https://www.intel.com/content/dam/www/public/us/en/documents/technical-specifications/dcmi-v1-5-rev-spec.pdf)) reports current, minimum, maximum and average power in watts over a sampling period, not cumulative energy. To use it, sample the power regularly across the window and sum the samples into watt-hours yourself.

Intel RAPL and similar counters are not accepted as readings. They measure CPU packages and, on some systems, memory ([Linux powercap documentation](https://docs.kernel.org/power/powercap/powercap.html)), and leave out the power supply, storage, network and fans.

## Estimates from hardware

The estimate uses the [Cloud Carbon Footprint methodology](https://www.cloudcarbonfootprint.org/docs/methodology), whose per-processor figures come from [SPECpower_ssj2008](https://www.spec.org/power_ssj2008/results/) server measurements:

watts = logical CPUs × (idle watts + utilization × (full-load watts − idle watts)) + 0.392 W per GB of memory + 1.2 W per TB of SSD + 0.65 W per TB of HDD

- **Idle and full-load watts** are per logical CPU, for the processor's generation, from the published [coefficient table](https://github.com/cloud-carbon-footprint/ccf-coefficients). The site leaves out two rows that do not fit their neighbours: EPYC 5th Gen, at about five times the adjacent generations, and the Graviton rows, which repeat EPYC 2nd Gen.
- **Utilization** is the host's average CPU use since boot, from `/proc/stat`. A report needs at least 24 hours of uptime.
- **Generation** comes from the CPU name in `/proc/cpuinfo`. A desktop or workstation processor uses the server row of the same core design: for example Ryzen 3000 with EPYC 2nd Gen (Zen 2), and 6th to 10th generation Core with Coffee Lake. A virtual machine that shows a named model, such as "AMD EPYC-Rome Processor", uses that model's row.
- **No estimate** is made when the generation cannot be identified, for example "QEMU Virtual CPU", low-power and ARM boards, processors older than Sandy Bridge, and generations the table does not cover. Such a host counts once its operator submits a reading.

For a virtual machine, the CPUs, memory and disks are the machine's own, so the estimate is its share of the physical host. For a dedicated or home host, the model covers CPU, memory and storage but not power-supply losses, fans or the motherboard, so it reads low. A measured reading replaces the estimate.

## How to submit

Install the [Nano.Community CLI](/cli), version 0.5.0 or later, and link a signing key to the representative account with `add-signing-key`. With the signing key set, on the host that runs the node:

- **Hardware report:** run `nano-community report-representative-hardware`. It shows every value it read before you confirm. Run it again after the host has been up for a while if it reports under 24 hours of uptime.
- **Measured reading:** run `nano-community update-representative-power-reading`, then enter the energy in whole watt-hours, the method, and the start and end of the window as ISO 8601 datetimes such as `2026-11-13T00:00:00Z`.

The site rejects a report or reading that is malformed or not signed for a representative account. Every one you sign is kept: the latest hardware report, and the reading whose window ends latest, are current.

## When to resubmit

Submit a new hardware report or reading after any change to the host's hardware, after moving the node to another host, or when the host's other workloads change. Inputs do not expire, so an old one keeps counting until you replace it.
