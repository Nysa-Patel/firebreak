# Fixing the Trends tab: give the backend a real database

**Symptom:** the Trends tab almost always says "not enough data," even for
locations checked many times today. **Cause:** the backend defaults to a
local SQLite file, and Render's free-tier web services get a fresh
filesystem on every deploy -- so that file (and all AQI trend history in it)
resets to empty on every push. This is not a bug in the trend logic itself;
it's that the data it would chart never survives a deploy.

**Fix:** point the backend at a real Postgres database instead. The code
already fully supports this (`backend/app/database.py` branches correctly on
the `DATABASE_URL` scheme) -- nothing to change there. This is a Render
dashboard action only, ~2 minutes, and does not touch or restart anything
about your existing Vercel frontend.

## Steps

1. Go to [dashboard.render.com](https://dashboard.render.com) and open your
   account (the same one `wildfire-exporisk-app` is deployed under).
2. **New +** → **PostgreSQL**. Name it anything (e.g. `firebreak-db`), pick
   the **Free** plan, and create it.
3. Once it's provisioned, open it and copy the **Internal Database URL**
   (starts with `postgresql://...`) -- internal, not external, since the
   backend and the database will be in the same Render account/region.
4. Go to your existing backend web service (`wildfire-exporisk-app` or
   whatever it's named) → **Environment** tab → **Add Environment
   Variable**:
   - Key: `DATABASE_URL`
   - Value: the connection string you just copied
5. Save. Render will redeploy the backend automatically with the new
   variable. Once it's back up, `AqiReading` rows will persist across future
   deploys instead of resetting, and the Trends tab will start accumulating
   real history from that point on.

## Note on `render.yaml`

`render.yaml` at the repo root documents this same setup as
infrastructure-as-code, but **don't use Render's "New Blueprint" flow on
it** unless you're deliberately standing up a fresh environment -- Render
would likely create a second, separate backend service rather than adopting
your existing one, which would fork your config and could change your
`wildfire-exporisk-app.onrender.com` URL. The manual steps above are the
safe path for your current, already-working deployment.

## Verifying it worked

After the redeploy, hit the AQI endpoint for the same location twice, a few
minutes apart, then check trend:

```bash
curl "https://wildfire-exporisk-app.onrender.com/api/aqi?lat=39.7285&lon=-121.8375"
# wait a few minutes, then:
curl "https://wildfire-exporisk-app.onrender.com/api/aqi?lat=39.7285&lon=-121.8375"
curl "https://wildfire-exporisk-app.onrender.com/api/trend?lat=39.7285&lon=-121.8375&hours=24"
```

If `readings` in the trend response has 2+ entries and `direction` is no
longer `"steady"` with the "not enough" basis message, it's working. Then
push any small commit (or just wait for a natural redeploy) to confirm
history survives it -- that's the actual test of the fix.
