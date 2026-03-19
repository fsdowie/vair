# How to Add IFAB Updates to VAIR

## When you see an important @TheIFAB tweet:

**Just share it with me and say "add this to VAIR"**

Example:
```
"Hey Claude, add this to VAIR:

https://x.com/TheIFAB/status/1234567890

Tweet says: New clarification on handball - deliberate handball
now considers arm position relative to body movement."
```

I'll:
1. Add it to `supabase/functions/ask-referee/ifab-updates.ts`
2. Redeploy the Edge Function
3. VAIR will now reference this in answers

## File Location

Updates are stored in:
`/Users/federico_samyndowie/Documents/Python Shared/VAIR/supabase/functions/ask-referee/ifab-updates.ts`

## Deploy After Adding

After I add updates, I'll run:
```bash
cd "/Users/federico_samyndowie/Documents/Python Shared/VAIR"
export SUPABASE_ACCESS_TOKEN="sbp_7ec4053a6178df9317683548d94d94769ff3d4df"
supabase functions deploy ask-referee --no-verify-jwt
```

---

**That's it!** Just share IFAB tweets and I'll keep VAIR updated. 🟢
