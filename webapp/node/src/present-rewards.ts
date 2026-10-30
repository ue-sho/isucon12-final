import type { UserPresentRow } from './types'

// Cards create one instance per present. Coins/materials can add their quantities together.
export function groupPresentRewards(presents: UserPresentRow[]): UserPresentRow[] {
  const grouped = new Map<string, UserPresentRow>()
  const rewards: UserPresentRow[] = []
  for (const present of presents) {
    if (![1, 3, 4].includes(present.item_type)) {
      rewards.push({ ...present })
      continue
    }
    const key = `${present.user_id}:${present.item_type}:${present.item_id}`
    const previous = grouped.get(key)
    if (previous) {
      previous.amount += present.amount
    } else {
      const reward = { ...present }
      grouped.set(key, reward)
      rewards.push(reward)
    }
  }
  return rewards
}
