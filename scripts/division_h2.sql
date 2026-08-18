-- Second-half divisions. Generated 2026-08-17.
-- teams.division stays as the FIRST-half division so round 1-11 standings keep
-- rendering the way they were played. division_h2 is what rounds 12-23 use.

BEGIN;

ALTER TABLE teams ADD COLUMN IF NOT EXISTS division_h2 text;

UPDATE teams SET division_h2 = 'championship' WHERE id = '579bad3e-bbc9-42f2-9371-22abd9da04d4';  -- XLIX Racing Team
UPDATE teams SET division_h2 = 'championship' WHERE id = '0a09b0a7-8d2c-451a-9541-29b3046aaee3';  -- Van City Corsa
UPDATE teams SET division_h2 = 'championship' WHERE id = '8ae6c08b-ce0e-4383-91c2-ceb17ba3db1a';  -- Juicero Silicon Valley
UPDATE teams SET division_h2 = 'championship' WHERE id = '2343928e-bdf3-415a-9f0a-ef3b6af5793f';  -- Drivetex
UPDATE teams SET division_h2 = 'championship' WHERE id = 'b4a23ce2-0b92-4db3-9ec8-20f7735d212f';  -- Cougar Autosport
UPDATE teams SET division_h2 = 'championship' WHERE id = '44aabae5-10ac-47e4-8314-27a67adec475';  -- East Bay Racing
UPDATE teams SET division_h2 = 'championship' WHERE id = '8c6bc36d-54ab-4df5-85f8-564128000041';  -- Cascadia Motorsport
UPDATE teams SET division_h2 = 'championship' WHERE id = '27ccc53b-cca4-4b6b-a166-7ed81b11c86f';  -- Meatballs
UPDATE teams SET division_h2 = 'championship' WHERE id = 'fc7843e9-bf07-493f-a9bf-59c6ce2f3a21';  -- HomeworkTubes.Com
UPDATE teams SET division_h2 = 'championship' WHERE id = '9a1eeebb-53f4-4435-842a-835fcb9c416f';  -- TNT Roku F5 Team
UPDATE teams SET division_h2 = 'championship' WHERE id = 'f3eab88a-5d25-4e3b-b7fc-2aa7a9ea4385';  -- Cal Aggie Racing
UPDATE teams SET division_h2 = 'championship' WHERE id = '4ce965b1-70bf-43db-a3b0-6585be8d8b5e';  -- Peloton Aubergine
UPDATE teams SET division_h2 = 'second' WHERE id = '8743272f-21a4-443c-af8b-819ea11615a2';  -- Luxor Motorsport
UPDATE teams SET division_h2 = 'second' WHERE id = '4c3cda25-74f1-4884-9e85-d45fff114e71';  -- Magic Kingdom Racing
UPDATE teams SET division_h2 = 'second' WHERE id = 'd9e7da52-4a19-48e0-8c5d-4cfce49f5f43';  -- Shoey Time! w/ Max and Danny
UPDATE teams SET division_h2 = 'second' WHERE id = '16ff8643-cd10-4ad5-9118-e4e50fb4a0ba';  -- TJ Premium
UPDATE teams SET division_h2 = 'second' WHERE id = '611053aa-8e7d-4b64-b37a-c34c3a59dd5f';  -- Prestissimo Veloce
UPDATE teams SET division_h2 = 'second' WHERE id = 'bfd3f733-9e00-4aec-8b30-42ac5f98f0d5';  -- Aggie Slipstream
UPDATE teams SET division_h2 = 'second' WHERE id = 'f3e74436-4bb4-4be6-b3b5-3829e29e032a';  -- Scuderia Iskandaraya
UPDATE teams SET division_h2 = 'second' WHERE id = 'a602540b-92f4-48f0-bff2-67e74fba1e67';  -- El Camino Rapido
UPDATE teams SET division_h2 = 'second' WHERE id = 'b9eb80e4-13ef-41d6-adff-1c8e64270c6a';  -- Stalloni 1851
UPDATE teams SET division_h2 = 'second' WHERE id = '113cbd29-f5b3-4311-a4ef-0b053404719d';  -- Bronco SCUderia
UPDATE teams SET division_h2 = 'second' WHERE id = '5c4087ab-d297-43c8-a132-d212ed0e1190';  -- Wildcat Motors
UPDATE teams SET division_h2 = 'second' WHERE id = '2cfbbd19-61c8-4c6a-87c1-6367a3f5483a';  -- Garra Dynamics

COMMIT;

-- Check: expect 12 and 12.
-- SELECT division_h2, count(*) FROM teams GROUP BY division_h2;
