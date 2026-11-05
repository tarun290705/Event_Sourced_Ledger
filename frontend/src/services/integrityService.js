import apiClient from './apiClient'

async function runCheck(path) {
  const { data } = await apiClient.post(`/integrity/${path}/`)
  return data
}

export const replayTransfers = () => runCheck('replay/transfers')
export const replayBalances = () => runCheck('replay/balances')
export const verifyTransfers = () => runCheck('verify/transfers')
export const verifyBalances = () => runCheck('verify/balances')
export const findMissingEvents = () => runCheck('missing-events')