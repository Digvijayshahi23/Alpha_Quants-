/**
 * The Alpha's history on one canvas, three ways: its cumulative PnL beside the
 * investability-constrained PnL, how far under water it was each day, and its Sharpe over
 * the trailing year against the submission cutoff. Figures stay neutral; loss is the only hue.
 */

import { createSeriesMarkers, LineSeries, LineStyle } from 'lightweight-charts'
import { useEffect, useRef } from 'react'
import { addUnderwater, baseChart, color, compact, zeroLine } from '@/screens/pool/pnl-chart'
export function AlphaChart({
  view,
  pnl,
  constrained,
  net,
  underwater,
  sharpe,
  cutoff,
  testStart,
  label,
}) {
  const element = useRef(null)
  useEffect(() => {
    const node = element.current
    if (!node) return
    const guide = color('color-ink-tertiary')
    const chart = baseChart(node)
    chart.applyOptions({
      localization: {
        priceFormatter:
          view === 'underwater'
            ? (p) => `${(p * 100).toFixed(1)}%`
            : view === 'sharpe'
              ? (p) => p.toFixed(2)
              : compact,
      },
    })
    const at = (points) =>
      points.map((p) => ({
        time: p.date,
        value: p.value,
      }))
    if (view === 'pnl') {
      if (constrained.length > 1) {
        chart
          .addSeries(LineSeries, {
            color: color('color-ink-tertiary'),
            lineWidth: 1,
            lineStyle: LineStyle.Dashed,
            priceLineVisible: false,
            lastValueVisible: false,
            title: 'Investability constrained',
          })
          .setData(at(constrained))
      }
      if (net.length > 1) {
        // Its own dates, not the gross line's: this series comes from the stored daily PnL,
        // which carries the closing days BRAIN counts but exports in no recordset.
        chart
          .addSeries(LineSeries, {
            color: color('color-status-warning'),
            lineWidth: 1,
            priceLineVisible: false,
            lastValueVisible: false,
            title: 'After cost',
          })
          .setData(at(net))
      }
      const ink = color('color-ink')
      const trained = color('color-ink-subtle')
      const series = chart.addSeries(LineSeries, {
        color: ink,
        lineWidth: 2,
        priceLineVisible: false,
        title: 'PnL',
      })
      // Compared, not matched: the boundary BRAIN reports can fall on a day with no trading.
      const held = (p) => testStart === null || p.date >= testStart
      series.setData(
        pnl.map((p) => ({
          time: p.date,
          value: p.value,
          color: held(p) ? ink : trained,
        })),
      )
      series.createPriceLine(zeroLine())
      const first = testStart === null ? undefined : pnl.find(held)
      if (first) {
        createSeriesMarkers(series, [
          {
            time: first.date,
            position: 'aboveBar',
            shape: 'arrowDown',
            color: guide,
            text: 'Test',
          },
        ])
      }
    } else if (view === 'underwater') {
      addUnderwater(chart, undefined, {
        lastValueVisible: true,
      }).setData(at(underwater))
    } else {
      const series = chart.addSeries(LineSeries, {
        color: color('color-ink'),
        lineWidth: 2,
        priceLineVisible: false,
        title: 'Sharpe, trailing year',
      })
      series.setData(at(sharpe))
      series.createPriceLine(zeroLine())
      if (cutoff !== null) {
        series.createPriceLine({
          price: cutoff,
          color: color('color-status-warning'),
          lineStyle: LineStyle.Dashed,
          lineWidth: 1,
          axisLabelVisible: true,
          title: 'Cutoff',
        })
      }
    }
    chart.timeScale().fitContent()
    return () => chart.remove()
  }, [view, pnl, constrained, net, underwater, sharpe, cutoff, testStart])
  return <div ref={element} role="img" aria-label={label} className="h-80 w-full min-w-0" />
}
