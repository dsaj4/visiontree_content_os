# SQLite Sync Guide

Last updated: 2026-05-12

`data/content-system.sqlite` is runtime data and should not be committed to Git.

Use this guide when you need to sync the production SQLite database with the local development database.

## Recommended Policy

- Production database is the source of truth for real content, publishing state, metrics, sessions, and uploads.
- Local database is for development, inspection, and controlled repair.
- Code, schema, seed/reference data, and migration scripts belong in Git.
- SQLite database files and uploads stay outside Git.

## File Locations

Default local database:

```powershell
data/content-system.sqlite
```

Default remote database:

```bash
/opt/visiontree/visiontree_content_os/data/content-system.sqlite
```

## Pull Production To Local

Use this when you want local development to inspect the server's current state.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync-sqlite.ps1 `
  -Direction pull `
  -Remote ecs-user@YOUR_SERVER_IP
```

The script backs up the current local database first under:

```powershell
data/db-backups/
```

## Push Local To Production

Use this only after you intentionally edited or repaired the local database and want production to use it.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync-sqlite.ps1 `
  -Direction push `
  -Remote ecs-user@YOUR_SERVER_IP `
  -RestartRemoteService
```

The script backs up the remote database first by copying:

```bash
content-system.sqlite -> content-system.sqlite.bak-YYYYMMDD-HHMMSS
```

## Backup Remote Only

```powershell
powershell -ExecutionPolicy Bypass -File scripts/sync-sqlite.ps1 `
  -Direction backup-remote `
  -Remote ecs-user@YOUR_SERVER_IP
```

## Safer Production Update Flow

For normal deployments, do not push your whole local database to production.

Prefer:

1. Pull latest code on server.
2. Back up remote SQLite.
3. Run any explicit migration or reference-data sync.
4. Restart service.
5. Verify API/database state.

Example:

```bash
cd /opt/visiontree/visiontree_content_os
git pull --ff-only
npm ci
npm run build
cp data/content-system.sqlite data/content-system.sqlite.bak-$(date +%Y%m%d-%H%M%S)
sudo systemctl restart visiontree-content-os
sqlite3 data/content-system.sqlite "select id,title from templates order by id;"
```

## Important Risks

- Pushing local SQLite overwrites production runtime data.
- If production content or metrics changed after you pulled the database, a later push can erase those changes.
- Stop or restart the service around push operations when possible, especially if users may be writing data.
- Upload files live under `data/uploads/`; syncing only the SQLite file does not sync uploaded media.

## When To Use Each Direction

| Goal | Direction |
| --- | --- |
| Inspect production locally | `pull` |
| Make local match production | `pull` |
| Repair production after testing a local database copy | `push` |
| Create a safety snapshot before server work | `backup-remote` |
| Update templates/reference data after code deploy | Prefer migration/sync script, not full DB push |
