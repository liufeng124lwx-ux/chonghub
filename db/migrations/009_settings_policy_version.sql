UPDATE site_settings
SET value = jsonb_set(value, '{version}', '1'::jsonb, true), revision = revision + 1, updated_at = now()
WHERE key = 'service_policy' AND NOT (value ? 'version');
