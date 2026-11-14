---
title: Network Energy Usage
description: How the energy figure on nano.community is calculated, how representative operators measure and submit power readings, and what the figure leaves out
tags: nano, xno, energy, power, representative, sustainability, measurement
---

# Network Energy Usage

The homepage shows "Energy a day" for the Nano network, with a line beneath it such as "from 2 of 49 principal reps (1 measured)". This page explains what that figure is, where each input comes from, and how a representative operator can add a measured reading.

## What is reported

The figure is the summed current power of the online principal representatives that report one, converted to a daily amount: total watts × 24 ÷ 1000 = kWh a day. It is the daily equivalent of the current rate, not energy metered over a particular day.

Each representative's power comes from one of two sources, in this order:

1. **A signed power reading.** The representative's operator measures the whole host over at least 24 hours and signs the result with a key linked to the representative account. The latest reading counts, whatever its age, for as long as the representative is an online principal representative. The card shows the date of the oldest reading in use.
2. **A CPU TDP specification.** A few representatives have a hand-entered thermal design power value for their CPU from earlier versions of this site. It is a manufacturer's specification, not a measurement, and it covers only the CPU. It is used only until the operator signs a reading. The table labels it "CPU TDP specification".

A representative with neither counts as not reporting. Nothing is estimated or averaged in its place. The coverage line always shows how many representatives the figure includes, so a low count is visible.

A signature proves who attested a reading, not that the reading is accurate. The figures are operator-attested. Every input is public on the [representatives page](/representatives), in the Power (W) column, with its source and date.

## Who counts

Only online principal representatives count. That is the same set as the principal representative count on the homepage: representatives that are online and hold at least 0.1% of the trended voting weight. That is the threshold the [Nano documentation](https://docs.nano.org/protocol-design/orv-consensus/) gives for a principal representative, whose votes other nodes rebroadcast.

The figure leaves out:

- non-principal representatives
- nodes that do not vote, such as wallet backends, exchanges and explorers
- the devices and networks of people sending transactions

It is therefore not a whole-network total. It is the energy of the voting nodes that secure the network, as far as their operators have reported it.

## The measurement boundary

A reading covers the whole host the node runs on: power supply, CPU, memory, storage, network interfaces and fans. If the host runs other workloads alongside the node, their energy is included. Say so in your representative description if it applies.

## Accepted methods

Measure the energy the host used over a window of at least 24 hours, so one full daily cycle is covered. Read a cumulative energy counter at the start and the end, and submit the difference in whole watt-hours.

- **`wall_meter`** — a plug-in or inline energy meter between the wall and the host's power supply. Use one that shows accumulated energy (kWh or Wh), not only instantaneous watts.
- **`baseboard_management_controller`** — the host's own power sensor, read through its management controller:
  - **Redfish:** the `EnergykWh` property of a chassis or system's [EnvironmentMetrics](https://redfish.dmtf.org/schemas/v1/EnvironmentMetrics.v1_3_1.json) "shall contain the total energy, in kilowatt-hour units, for this resource". A [Sensor](https://redfish.dmtf.org/schemas/v1/Sensor.v1_10_0.json) with an energy reading type gives the same. Take the difference between two readings.
  - **IPMI DCMI:** "Get Power Reading" (section 6.6.1 of the [DCMI 1.5 specification](https://www.intel.com/content/dam/www/public/us/en/documents/technical-specifications/dcmi-v1-5-rev-spec.pdf)) reports current, minimum, maximum and average power in watts over a sampling period. It does not report cumulative energy. To use it, sample the power regularly across the window and sum the samples into watt-hours yourself. The reading is then your own sampled total.

## What is not accepted

- **RAPL and other CPU counters.** Intel RAPL and similar counters measure CPU packages and, on some systems, memory ([Linux powercap documentation](https://docs.kernel.org/power/powercap/powercap.html)). They leave out the power supply, storage, network and fans, so they understate the host.
- **Modeled or estimated values.** These include TDP-based estimates, figures derived from CPU utilization, and calculators. The existing CPU TDP values are kept, clearly labeled, only because they are the only information held for those representatives. They are replaced as soon as the operator signs a reading.
- **Shared virtual machines.** An operator cannot measure a node on a shared cloud or VPS host. None of the providers most representatives run on (Hetzner, DigitalOcean, Contabo, OVHcloud and AWS) publishes per-instance energy to customers. The account-level carbon tools that exist are modeled and monthly, for example the [AWS Customer Carbon Footprint Tool](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/ccft-overview.html). These representatives stay unmeasured unless they move to hardware the operator can meter.

## How to submit a reading

1. Measure the host over at least 24 hours with one of the accepted methods. Note the start and end times and the energy used in watt-hours.
2. Install the [Nano.Community CLI](/cli), version 0.5.0 or later, and link a signing key to the representative account with `add-signing-key`.
3. With the signing key set, run:

   ```bash
   nano-community update-representative-power-reading
   ```

4. Enter the energy in whole watt-hours, the method (`wall_meter` or `baseboard_management_controller`), and the start and end as ISO 8601 datetimes, such as `2026-11-13T00:00:00Z`.

The site rejects a reading whose window is under 24 hours, ends after it was signed, or is not signed for a representative account. Every reading you sign is kept. The one whose window ends latest is current.

## When to re-measure

Sign a new reading after any change to the host's hardware, after moving the node to another host, or when the host's other workloads change. Readings do not expire, so an old reading keeps counting until you replace it. To correct a wrong reading, sign one over a later window.

## Changelog

- 2026-11: The figure now uses signed, operator-measured readings, falling back to the existing CPU TDP values. Representatives with neither are counted as not reporting. Previously, every representative without a TDP value was assigned the average of the TDP values, and the homepage did not show coverage.
