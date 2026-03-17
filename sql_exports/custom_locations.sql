-- SQL dump for table: custom_locations
-- Generated on Tue Mar 17 09:42:28 UTC 2026

BEGIN;

INSERT INTO custom_locations (
    id, name, latitude, longitude, type, country, radius, notes, is_active, created_at, updated_at, created_by
) VALUES
    ('415c44c9-6cbd-4ca8-bde8-1a40be75db91', 'Mzantsi Solutions', -26.10281503204371, 28.263248579760702, 'customer', 'South Africa', 500, '', true, '2026-02-13T07:26:48.231731', '2026-02-13T07:26:48.231731', NULL),
    ('7a91b051-bd15-4e9b-8062-c5b01ff16abe', 'Harare', -17.79800576701706, 31.0616647680259, 'customer', 'Zimbabwe', 500, '', true, '2026-02-13T07:30:23.677002', '2026-02-13T07:30:23.677002', NULL),
    ('3597ba37-abb8-4b7d-a1f2-a92110d552cc', 'Harare', -17.79800576701706, 31.0616647680259, 'depot', 'Zimbabwe', 500, '', true, '2026-02-13T07:33:30.151386', '2026-02-13T07:33:30.151386', NULL),
    ('8bd1a798-f7f7-4e8f-84d3-bec9b9347546', 'LARN DISTRIBUTORS (PVT) LTD', -17.846825932960552, 31.133055886687686, 'warehouse', 'Zimbabwe', 500, '', true, '2026-02-17T05:43:32.376224', '2026-02-17T05:43:32.376224', NULL),
    ('ea6d6d08-19e3-45ae-9a91-7d846174c583', 'LARN DISTRIBUTORS (PVT) LTD', -17.846957960448293, 31.133214297548232, 'customer', 'Zimbabwe', 500, '', true, '2026-02-17T16:47:12.918981', '2026-02-17T16:47:12.918981', NULL),
    ('b7205f0d-bb49-428f-a84a-45589004df7e', 'WESTFALIA FRUTO MOZAMBIQUE', -19.107483583513154, 33.46252473075223, 'customer', 'Mozambique', 500, '', true, '2026-02-17T16:59:36.706664', '2026-02-17T16:59:36.706664', NULL),
    ('75704778-f638-4a9c-a221-a74df4ce6262', 'PLUS ZERO ', -26.091177655948883, 28.269826760935498, 'customer', 'South Africa', 500, '', true, '2026-02-17T17:00:30.128795', '2026-02-17T17:00:30.128795', NULL),
    ('27bd4c86-53c9-4e3b-a8e7-f3480f1975da', 'Natural Air / ACDC Dynamics', -17.846901018425623, 31.13320518650464, 'warehouse', 'Zimbabwe', 500, '', true, '2026-02-24T09:25:37.822457', '2026-02-24T09:25:37.822457', NULL),
    ('e5b8923f-e3f7-446e-b4fd-fbd72bb24521', 'DSV', -26.06235179619948, 28.28211451702612, 'warehouse', 'South Africa', 500, '', true, '2026-03-09T11:50:25.208053', '2026-03-09T11:50:25.208053', NULL),
    ('d5aafccc-e0ba-4ea7-ac35-87c0e19ffb22', 'FRASCATI FARM', -17.595225, 31.44416, 'farm', 'Zimbabwe', 500, '', true, '2026-03-16T14:00:30.373999', '2026-03-16T14:00:30.373999', NULL),
    ('5ddb9f80-d565-4369-a998-b9d87b21bf29', 'Morgan Cargo', -26.107454258894748, 28.242733511651213, 'depot', 'South Africa', 500, '1 Northern Perimeter Rd, O.R. Tambo, Kempton Park, 1627', true, '2026-03-16T14:04:22.114525', '2026-03-16T14:04:22.114525', NULL),
    ('160fd385-44b9-4521-ab23-663b1f32cd18', 'Morgan Cargo', -26.10737718545906, 28.242991003687116, 'depot', 'Zimbabwe', 500, '1 Northern Perimeter Rd, O.R. Tambo, Kempton Park, 1627', true, '2026-03-16T16:01:21.88696', '2026-03-16T16:01:21.88696', NULL),
    ('15c0eee4-e22d-4ec1-84e3-c65f266eed1c', 'Morgan-Cargo', -26.107444624718063, 28.243323597568374, 'depot', 'South Africa', 500, '-26.107444624718063, 28.243323597568374', true, '2026-03-16T16:03:20.679331', '2026-03-16T16:03:20.679331', NULL),
    ('016c4db4-d839-4003-a383-f5cccb0cd50a', 'Cargo Morgan', -26.10790706, 28.241778645, 'depot', 'South Africa', 500, '-26.107907064303333, 28.241778645345764', true, '2026-03-16T16:04:44.245759', '2026-03-16T16:04:44.245759', NULL),
    ('e8e169a1-c77c-4003-82d5-f74986a6e671', 'Plastic Ideas Crates', -26.242716726531558, 28.09968015582561, 'warehouse', 'South Africa', 500, '427 Southern Klipriviersberg Rd, Steeledale, Johannesburg South, 2197', true, '2026-03-16T16:25:03.050465', '2026-03-16T16:25:03.050465', NULL)
;

COMMIT;
