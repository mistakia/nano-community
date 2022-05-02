---
title: Custom Internal Stats
description: Adding Custom Internal Stats
tags: nano, integration, guide, building, development
---

# Custom Internal Stats
The reference Nano node has internal stat counters that are used to monitor a number of aspects of the node such as incoming and outgoing tcp traffic, they can be accessed via the <a href="https://docs.nano.org/commands/rpc-protocol/#stats">stats RPC</a>. While the node is setup to monitor a large number of elements it may be necessary to add your own custom counters for current or future features.

## Adding a Custom Stat
If we wanted to measure the number of incoming messages from our peers we could setup an internal counter with a custom type as `traffic_count` and then add an additional detail `traffic_incoming` which would be a subset within this custom type. To setup this custom type we need to edit:
- <a href="https://github.com/nanocurrency/nano-node/blob/develop/nano/lib/stats.cpp">nano/lib/stats.cpp</a>
  - Add a new case to this <a href="https://github.com/nanocurrency/nano-node/blob/6386ab78e88f1a437f2fed22918d2723c1673ca7/nano/lib/stats.cpp#L466">switch</a> 

```
    case nano::stat::type::vote_generator:
            res = "vote_generator";
            break;
+       case nano::stat::type::traffic_count:
+           res = "traffic_count";
+           break;
        }
        return res;
```
- <a href="https://github.com/nanocurrency/nano-node/blob/develop/nano/lib/stats.cpp">nano/lib/stats.cpp</a>
  - Add a new case to this <a href="https://github.com/nanocurrency/nano-node/blob/6386ab78e88f1a437f2fed22918d2723c1673ca7/nano/lib/stats.cpp#L544">switch</a> 


```
    case nano::stat::detail::invalid_network:
        res = "invalid_network";
        break;
+   case nano::stat::detail::traffic_incoming:
+       res = "traffic_incoming";
+       break;
        }
        return res;
```

- <a href="https://github.com/nanocurrency/nano-node/blob/develop/nano/lib/stats.hpp">nano/lib/stats.hpp</a>
  - Add the custom `type` to this <a href="https://github.com/nanocurrency/nano-node/blob/6386ab78e88f1a437f2fed22918d2723c1673ca7/nano/lib/stats.hpp#L220">public class</a>
````
                requests,
                filter,
                telemetry,
-               vote_generator
+               vote_generator,
+                traffic_count
        };
````
- <a href="https://github.com/nanocurrency/nano-node/blob/develop/nano/lib/stats.hpp">nano/lib/stats.hpp</a>
  - Add the custom `detail` to this <a href="https://github.com/nanocurrency/nano-node/blob/6386ab78e88f1a437f2fed22918d2723c1673ca7/nano/lib/stats.hpp#L248">public class</a>
````
                generator_replies_discarded,
-               generator_spacing
+               generator_spacing,
+
+               traffic_incoming
        };
````
- <a href="https://github.com/nanocurrency/nano-node/blob/develop/nano/node/network.cpp">nano/node/network.cpp</a>
  - Now you can add your custom counter to the point in the node code to start counting. In this example we are putting it in `nano/node/network.cpp` inside the <a href="https://github.com/nanocurrency/nano-node/blob/6386ab78e88f1a437f2fed22918d2723c1673ca7/nano/node/network.cpp#L14">nano::network::network</a> function:
 ````
                 if (message.header.network == id)
                {
                        process_message (message, channel);
+                       this->node.stats.inc (nano::stat::type::traffic_count, nano::stat::detail::traffic_incoming);
+
                }
                else
                {
 ````

## Accessing your custom stat
When testing on the beta network you can get your custom stats using this command:

`curl -d '{ "action" : "stats", "type" : "counters" }' 127.0.0.1:55000`

This will give an output for example:
```
            "time": "20:45:33",
            "type": "traffic_count",
            "detail": "all",
            "dir": "in",
            "value": "5593"
        },
        {
            "time": "20:45:33",
            "type": "traffic_count",
            "detail": "traffic_incoming",
            "dir": "in",
            "value": "5593"
        }
    ],
    "stat_duration_seconds": "155"
```
