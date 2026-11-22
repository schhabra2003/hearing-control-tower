import csv,sys,itertools
rows=list(csv.DictReader(open(sys.argv[1])))
n_cases=24
inb=[r for r in rows if r['from_']!='firm']
routine=sum(1 for r in inb if r['exception']=='0'); exc=sum(1 for r in inb if r['exception']=='1')
firm=sum(1 for r in rows if r['from_']=='firm'); calls=sum(1 for r in rows if 'phone' in r['channel'] and r['from_']=='firm')
print('inbound',len(inb),'routine',routine,'exception',exc,'firm outputs',firm,'firm calls',calls)
# assumption ranges (minutes) low/mid/high -- ESTIMATES
A=dict(read_routine=(1,2,3), exc=(8,15,25), firm_msg=(3,5,8), call=(5,10,15))
def today(k):
    i={'low':0,'mid':1,'high':2}[k]
    return (routine*A['read_routine'][i]+exc*A['exc'][i]+(firm-calls)*A['firm_msg'][i]+calls*A['call'][i])/n_cases
for k in ['low','mid','high']: print('today min/hearing',k,round(today(k),1))
# future: routine auto-handled (human only approves gov-facing drafts ~1 min each), exceptions human but with context (x f)
gov_drafts_per_case=1.0  # staffing notice/packet send per case needing approval early on
def future(exc_rate_mult, exc_min, approve_min, approve_share):
    exc_n=exc/n_cases*exc_rate_mult
    return exc_n*exc_min + gov_drafts_per_case*approve_share*approve_min
print('future mid (exceptions same rate, 15*0.5 min each, all gov drafts approved 1min):',round(future(1,7.5,1,1),1))
print('future mature (exceptions -40% via portal/SMS, 7.5min, 20% drafts reviewed):',round(future(0.6,7.5,1,0.2),1))
print('future pessimistic (no exception reduction, 15 min, all approvals 2 min):',round(future(1,15,2,1),1))
