-- SQL dump for table: client_feedback
-- Generated on Tue Mar 17 09:42:31 UTC 2026

BEGIN;

INSERT INTO client_feedback (
    id, load_id, client_id, rating, comment, created_at, updated_at
) VALUES
    ('5c3b4162-0621-47bc-8b3b-aec5891a5225', 'd430b78d-ad22-4a70-8e3c-6c98937facb8', '9a07c66c-4a8e-4db7-b095-1d79781ba2a9', 'happy', NULL, '2026-02-25T06:00:16.802311', '2026-02-25T06:00:16.526'),
    ('c977cf55-be31-4957-a3a0-afd63a320992', '29aa0f59-d964-4c9f-b0c3-35ce9e33dc28', '9a07c66c-4a8e-4db7-b095-1d79781ba2a9', 'happy', NULL, '2026-02-25T10:36:44.869687', '2026-02-25T10:36:44.509'),
    ('6e1b3210-aee9-475f-9e96-c3fdb0fa469c', '4e66468e-1151-4e4b-8964-aa5d72ea1f2a', 'a6691d75-c4c1-40bd-bea7-1c78dcb0afb3', 'happy', NULL, '2026-02-26T06:48:46.297602', '2026-02-26T06:48:46.53'),
    ('9df4b04c-22e6-42b2-978b-c8d79b7dac7f', '5d886513-44b4-439a-b0d2-3ce36ff778ce', 'a6691d75-c4c1-40bd-bea7-1c78dcb0afb3', 'happy', NULL, '2026-02-26T06:48:48.734261', '2026-02-26T06:49:04.17'),
    ('647d35cf-f05a-4157-8163-3708114a8351', '905aaf6a-39d0-41c3-abd9-dddcac012246', 'a6691d75-c4c1-40bd-bea7-1c78dcb0afb3', 'unhappy', 'Driver arrogant - refused to depart on time', '2026-02-26T06:48:47.431235', '2026-02-26T07:41:33.823'),
    ('e6234f51-0041-4c51-b445-b090a1773a12', '204aca16-f06d-4771-917e-ae83aad615f2', '9a07c66c-4a8e-4db7-b095-1d79781ba2a9', 'happy', NULL, '2026-02-26T10:15:31.224005', '2026-02-26T10:15:31.493')
;

COMMIT;
