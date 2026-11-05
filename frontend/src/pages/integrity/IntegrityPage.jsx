import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import Button from '../../components/ui/Button'
import ResultPanel, { ResultBanner } from './ResultPanel'
import {
  MissingEventsResult,
  ReplayBalancesResult,
  ReplayTransfersResult,
  VerifyBalancesResult,
  VerifyTransfersResult,
} from './results'
import { useIntegrityCheck } from '../../hooks/useIntegrityCheck'
import {
  findMissingEvents,
  replayBalances,
  replayTransfers,
  verifyBalances,
  verifyTransfers,
} from '../../services/integrityService'

// idle | running | pass | problem (inconsistency or unreplayable events) | unavailable (could not run)
function outcomeOf(check) {
  if (check.status === 'idle') return 'idle'
  if (check.status === 'running') return 'running'
  if (check.status === 'failed') return check.error.status === 422 ? 'problem' : 'unavailable'

  return check.data.is_consistent ? 'pass' : 'problem'
}

function Summary({ checks }) {
  const outcomes = checks.map(({ check }) => outcomeOf(check))
  const namesWhere = (target) =>
    checks
      .filter((_, index) => outcomes[index] === target)
      .map(({ name }) => name)
      .join(', ')
  const passed = outcomes.filter((outcome) => outcome === 'pass').length

  if (outcomes.includes('running')) return <ResultBanner tone="info" title="Running checks…" />

  if (outcomes.includes('problem')) {
    return (
      <ResultBanner tone="error" title="Integrity problems found">
        Problems in: {namesWhere('problem')}.
      </ResultBanner>
    )
  }

  if (outcomes.includes('unavailable')) {
    return (
      <ResultBanner tone="warning" title="Some checks could not run">
        Could not run: {namesWhere('unavailable')}. {passed} of {checks.length} checks passed.
      </ResultBanner>
    )
  }

  if (passed === checks.length) return <ResultBanner tone="success" title="All consistency checks passed" />

  if (passed > 0) {
    return (
      <ResultBanner tone="info" title={`${passed} of ${checks.length} consistency checks passed`}>
        Run the remaining checks to complete the picture.
      </ResultBanner>
    )
  }

  return (
    <ResultBanner tone="info" title="No checks have been run yet">
      Use “Run all consistency checks” or run each check below.
    </ResultBanner>
  )
}

export default function IntegrityPage() {
  const verifyTransfersCheck = useIntegrityCheck(verifyTransfers)
  const verifyBalancesCheck = useIntegrityCheck(verifyBalances)
  const missingEventsCheck = useIntegrityCheck(findMissingEvents)
  const replayTransfersCheck = useIntegrityCheck(replayTransfers)
  const replayBalancesCheck = useIntegrityCheck(replayBalances)

  const [runningAll, setRunningAll] = useState(false)

  const consistencyChecks = [
    { name: 'Transfers', check: verifyTransfersCheck },
    { name: 'Account balances', check: verifyBalancesCheck },
    { name: 'Missing events', check: missingEventsCheck },
  ]

  // One after another: each check scans the whole event log
  const runAll = async () => {
    setRunningAll(true)

    try {
      await verifyTransfersCheck.run()
      await verifyBalancesCheck.run()
      await missingEventsCheck.run()
    } finally {
      setRunningAll(false)
    }
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="card__body stack">
          <div>
            <h2>Verify the ledger against its event history</h2>
            <p className="text-muted">
              Every posted transaction and completed transfer is recorded as an immutable event. These checks rebuild
              state from those events and compare it with the live database. All checks are read-only and never change
              data.
            </p>
          </div>
          <div>
            <Button icon={ShieldCheck} onClick={runAll} loading={runningAll}>
              Run all consistency checks
            </Button>
          </div>
        </div>
      </section>

      <Summary checks={consistencyChecks} />

      <h2 className="section-title">Consistency checks</h2>

      <ResultPanel
        title="Verify transfers"
        description="Compares every transfer in the database with the transfer rebuilt from its event."
        check={verifyTransfersCheck}
        renderResult={(data) => <VerifyTransfersResult data={data} />}
      />
      <ResultPanel
        title="Verify account balances"
        description="Compares each account's balance rebuilt from events with its live ledger balance."
        check={verifyBalancesCheck}
        renderResult={(data) => <VerifyBalancesResult data={data} />}
      />
      <ResultPanel
        title="Find posted transactions missing events"
        description="Looks for posted ledger transactions that have no LedgerTransactionPosted event."
        check={missingEventsCheck}
        renderResult={(data) => <MissingEventsResult data={data} />}
      />

      <h2 className="section-title">Event replay</h2>
      <p className="text-muted">
        Replay shows what the events alone imply. It does not compare anything, so use the checks above to find
        inconsistencies.
      </p>

      <ResultPanel
        title="Replay transfer projection"
        description="Rebuilds the set of transfers from the TransferCompleted events."
        runLabel="Run replay"
        check={replayTransfersCheck}
        renderResult={(data) => <ReplayTransfersResult data={data} />}
      />
      <ResultPanel
        title="Replay account balances"
        description="Rebuilds every account balance from the LedgerTransactionPosted events."
        runLabel="Run replay"
        check={replayBalancesCheck}
        renderResult={(data) => <ReplayBalancesResult data={data} />}
      />
    </div>
  )
}