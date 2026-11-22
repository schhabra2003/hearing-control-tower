# SUPERSEDED. This was the first desk model (17 November). The business case now lives in
# prototype/src/economics.js (run: node cli/economics.js), which replaced two assumptions below with
# sourced figures: the win rate (65% here, 50% sourced) and the coordinator cost ($42.50 here, $33).
# Kept only because prototype/src/sim.js cites the minute assumptions in this folder.
# Economics model for the design doc. Every input is an ASSUMPTION unless noted; ranges are low/mid/high.
fee_share = 0.25                               # sourced: FairAppeal public pricing (25% of first-year savings)
savings = dict(low=400, mid=774, high=1500)    # mid: Ownwell company claim ($774 avg annual savings); range = estimate
p_win   = dict(low=0.50, mid=0.65, high=0.85)  # Cook BOR 50.45% reduced (sourced); Ownwell 86% (company claim); mid = estimate
consultant = dict(low=75, mid=90, high=110)    # packet (fictional) rate per hearing
ops_rate = dict(low=35, mid=42.5, high=50)     # loaded $/hour for an ops coordinator: estimate
base_min = dict(low=10.5, mid=19.6, high=31.8) # baseline human minutes per hearing (packet-derived estimate)
fut_min  = dict(pess=14.5, launch=7.2, mature=4.0)

print('== expected fee per attended hearing ==')
fee = {k: fee_share*savings[k]*p_win[k] for k in savings}
for k,v in fee.items(): print(f'  {k}: ${v:,.0f}')
print(f"  contribution before ops, mid: ${fee['mid']-consultant['mid']:,.0f}  (fee {fee['mid']:.0f} - consultant {consultant['mid']})")

print('== ops cost per hearing today vs future (mid minutes) ==')
for k in ops_rate:
    print(f"  ops rate {k} ${ops_rate[k]}/h: today ${base_min['mid']/60*ops_rate[k]:.2f} | launch ${fut_min['launch']/60*ops_rate[k]:.2f} | mature ${fut_min['mature']/60*ops_rate[k]:.2f}")

print('== time saved per hearing ($) ==')
sav = {}
for name,fm in fut_min.items():
    lo = (base_min['mid']-fm)/60*ops_rate['low']; hi=(base_min['mid']-fm)/60*ops_rate['high']
    sav[name]=(lo,hi); print(f'  vs {name}: {base_min["mid"]-fm:.1f} min -> ${lo:.2f} to ${hi:.2f}')

print('== value of avoided misses per hearing ($): miss-rate drop x expected fee (mid) ==')
for drop in (0.005,0.015,0.03,0.05):
    print(f"  miss rate down {drop*100:.1f} pts: ${drop*fee['mid']:.2f} (fee only) | ${drop*(fee['mid']+savings['mid']):.2f} incl. homeowner's lost first-year saving")

print('== break-even hearings/year on TIME SAVED ALONE ==')
for label,cost in (('Lean build: associate + AI coding tools, platform + contractor hardening ~$40k/yr',40000),('Dedicated engineer $150k',150000),('Dedicated engineer $200k',200000)):
    lo=cost/sav['mature'][1]; hi=cost/sav['launch'][0]
    print(f'  {label}: {lo:,.0f} to {hi:,.0f} hearings/yr')

print('== peak-season ops headcount (capacity framing) ==')
prod_hours=25        # productive coordination hours per ops person per week: estimate
peak_share, peak_weeks = 0.60, 8   # 60% of annual hearings in 8 weeks: estimate (seasonality is sourced qualitatively)
for annual in (1000,5000,20000,50000):
    wk = annual*peak_share/peak_weeks
    row=[f'{annual:>6,} hearings/yr -> {wk:>6,.0f}/peak week:']
    for name,m in (('today',base_min['mid']),('launch',fut_min['launch']),('mature',fut_min['mature'])):
        row.append(f'{name} {wk*m/60/prod_hours:5.1f} FTE')
    print('  '+' | '.join(row))
print('capacity per ops person per week:', {n: round(prod_hours*60/m) for n,m in (('today',19.6),('launch',7.2),('mature',4.0))})
