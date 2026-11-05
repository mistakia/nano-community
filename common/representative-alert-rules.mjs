// Representative alert rules shared by the Alerts tab and the network events
// detectors, so both use one definition. Pure functions over plain values.
import { REPRESENTATIVE_CEMENTED_BEHIND_BLOCKS } from './network-event-types.mjs'

export const REPRESENTATIVE_LOW_UPTIME_SHARE = 0.75

// Share of uptime samples in which the representative was online, or null
// when there are no samples to judge.
export const get_representative_uptime_share = ({
  online_count,
  total_count
}) => (total_count ? online_count / total_count : null)

export const is_representative_low_uptime = ({ online_count, total_count }) => {
  const uptime_share = get_representative_uptime_share({
    online_count,
    total_count
  })
  return uptime_share !== null && uptime_share < REPRESENTATIVE_LOW_UPTIME_SHARE
}

export const is_representative_cemented_behind = (cemented_behind) =>
  Number(cemented_behind) > REPRESENTATIVE_CEMENTED_BEHIND_BLOCKS
